const gridSize = 15;
let gameGrid = [];
let placedWords = [];
let foundWords = new Set();
let isSelecting = false;
let selectedCells = [];
let startTime = null;
let timerInterval = null;
let gameStarted = false;

function initializeGame(themeConfig) {
    const { words, visitorKey, pdfName, themeName } = themeConfig;
    const allWords = Object.values(words).flat();
    const mysteryWord = allWords.map(word => word[0]).join('').toUpperCase();

    // Visitor counter
    function updateVisitorCount() {
        let count = localStorage.getItem(visitorKey);
        if (!count) {
            count = Math.floor(Math.random() * 1000) + 500;
        } else {
            count = parseInt(count) + 1;
        }
        localStorage.setItem(visitorKey, count);
        document.getElementById('visitorCount').textContent = count.toLocaleString();
    }

    // Initialize empty grid
    function initializeGrid() {
        gameGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
        placedWords = [];
        foundWords.clear();
    }

    // Place a word in the grid
    function placeWord(word, startRow, startCol, direction) {
        const directions = {
            horizontal: [0, 1],
            vertical: [1, 0],
            diagonal: [1, 1],
            diagonalUp: [-1, 1],
            horizontalReverse: [0, -1],
            verticalReverse: [-1, 0],
            diagonalReverse: [-1, -1],
            diagonalUpReverse: [1, -1]
        };

        const [dRow, dCol] = directions[direction];
        const positions = [];

        for (let i = 0; i < word.length; i++) {
            const row = startRow + i * dRow;
            const col = startCol + i * dCol;
            if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
                return false;
            }
            if (gameGrid[row][col] !== '' && gameGrid[row][col] !== word[i]) {
                return false;
            }
            positions.push([row, col]);
        }

        positions.forEach(([row, col], i) => {
            gameGrid[row][col] = word[i];
        });

        placedWords.push({
            word,
            positions,
            direction,
            found: false
        });

        return true;
    }

    // Try to place a word randomly
    function tryPlaceWord(word) {
        const directions = ['horizontal', 'vertical', 'diagonal', 'diagonalUp', 'horizontalReverse', 'verticalReverse', 'diagonalReverse', 'diagonalUpReverse'];
        const attempts = 100;

        for (let attempt = 0; attempt < attempts; attempt++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const startRow = Math.floor(Math.random() * gridSize);
            const startCol = Math.floor(Math.random() * gridSize);

            if (placeWord(word, startRow, startCol, direction)) {
                return true;
            }
        }
        return false;
    }

    // Fill empty cells with random letters
    function fillEmptyCells() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                if (gameGrid[row][col] === '') {
                    gameGrid[row][col] = letters[Math.floor(Math.random() * letters.length)];
                }
            }
        }
    }

    // Generate the complete grid
    function generateGrid() {
        initializeGrid();
        const sortedWords = [...allWords].sort((a, b) => b.length - a.length);
        sortedWords.forEach(word => {
            tryPlaceWord(word);
        });
        fillEmptyCells();
    }

    // Render the grid
    function renderGrid() {
        const gridContainer = document.getElementById('wordGrid');
        gridContainer.innerHTML = '';

        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.textContent = gameGrid[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('mousedown', startSelection);
                cell.addEventListener('mouseenter', continueSelection);
                cell.addEventListener('mouseup', endSelection);
                gridContainer.appendChild(cell);
            }
        }
    }

    // Render word lists
    function renderWordLists() {
        Object.entries(words).forEach(([category, wordList]) => {
            const container = document.getElementById(`${category}-words`);
            container.innerHTML = '';
            wordList.forEach(word => {
                const wordElement = document.createElement('div');
                wordElement.className = 'word-item cursor-pointer';
                wordElement.textContent = word;
                wordElement.dataset.word = word;
                container.appendChild(wordElement);
            });
        });
    }

    // Selection handling
    function startSelection(e) {
        if (!gameStarted) return;
        isSelecting = true;
        selectedCells = [e.target];
        e.target.classList.add('selected');
    }

    function continueSelection(e) {
        if (!isSelecting || !gameStarted) return;
        selectedCells.forEach(cell => cell.classList.remove('selected'));
        const startCell = selectedCells[0];
        const endCell = e.target;
        selectedCells = getLinearSelection(startCell, endCell);
        selectedCells.forEach(cell => cell.classList.add('selected'));
    }

    function endSelection(e) {
        if (!isSelecting || !gameStarted) return;
        isSelecting = false;
        const selectedWord = selectedCells.map(cell => cell.textContent).join('');
        const reverseWord = selectedWord.split('').reverse().join('');
        if (allWords.includes(selectedWord) || allWords.includes(reverseWord)) {
            const word = allWords.includes(selectedWord) ? selectedWord : reverseWord;
            if (!foundWords.has(word)) {
                foundWords.add(word);
                selectedCells.forEach(cell => {
                    cell.classList.remove('selected');
                    cell.classList.add('found');
                });
                const wordElement = document.querySelector(`[data-word="${word}"]`);
                if (wordElement) {
                    wordElement.classList.add('found');
                }
                updateGameStats();
                checkGameComplete();
            }
        } else {
            selectedCells.forEach(cell => cell.classList.remove('selected'));
        }
        selectedCells = [];
    }

    // Get linear selection between two cells
    function getLinearSelection(startCell, endCell) {
        const startRow = parseInt(startCell.dataset.row);
        const startCol = parseInt(startCell.dataset.col);
        const endRow = parseInt(endCell.dataset.row);
        const endCol = parseInt(endCell.dataset.col);
        const selection = [];
        const rowDiff = endRow - startRow;
        const colDiff = endCol - startCol;
        if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
            const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
            const rowStep = steps === 0 ? 0 : rowDiff / steps;
            const colStep = steps === 0 ? 0 : colDiff / steps;
            for (let i = 0; i <= steps; i++) {
                const row = startRow + Math.round(i * rowStep);
                const col = startCol + Math.round(i * colStep);
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) selection.push(cell);
            }
        }
        return selection.length > 0 ? selection : [startCell];
    }

    // Update game statistics
    function updateGameStats() {
        document.getElementById('foundWords').textContent = foundWords.size;
        document.getElementById('progressPercent').textContent = Math.round((foundWords.size / allWords.length) * 100) + '%';
    }

    // Timer functions
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
    }

    function updateTimer() {
        if (!startTime) return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    // Check if game is complete
    function checkGameComplete() {
        if (foundWords.size === allWords.length) {
            stopTimer();
            document.getElementById('mysteryWordSection').style.display = 'block';
            setTimeout(() => {
                alert('🎉 Félicitations ! Vous avez trouvé tous les mots ! Entrez le mot mystère ci-dessous.');
            }, 500);
        }
    }

    // Validate mystery word
    function validateMysteryWord() {
        const input = document.getElementById('mysteryWordInput').value.toUpperCase();
        const feedback = document.getElementById('mysteryWordFeedback');
        if (input === mysteryWord) {
            feedback.textContent = '🎉 Bravo ! Vous avez trouvé le mot mystère !';
            feedback.classList.add('text-green-400');
            feedback.classList.remove('text-red-400');
            stopTimer();
        } else {
            feedback.textContent = 'Mot incorrect. Essayez encore !';
            feedback.classList.add('text-red-400');
            feedback.classList.remove('text-green-400');
        }
    }

    // Show solution
    function showSolution() {
        placedWords.forEach(wordData => {
            wordData.positions.forEach(([row, col]) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.classList.add('found');
                }
            });
        });
        allWords.forEach(word => {
            foundWords.add(word);
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            if (wordElement) {
                wordElement.classList.add('found');
            }
        });
        updateGameStats();
        checkGameComplete();
        stopTimer();
    }

    // Reset game
    function resetGame() {
        foundWords.clear();
        stopTimer();
        startTime = null;
        gameStarted = false;
        document.getElementById('timer').textContent = '00:00';
        updateGameStats();
        const startBtn = document.getElementById('startBtn');
        startBtn.innerHTML = '<i class="fas fa-play"></i> Commencer le Jeu';
        startBtn.disabled = false;
        document.getElementById('mysteryWordSection').style.display = 'none';
        document.getElementById('mysteryWordInput').value = '';
        document.getElementById('mysteryWordFeedback').textContent = '';
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('found', 'selected');
        });
        document.querySelectorAll('.word-item').forEach(item => {
            item.classList.remove('found');
        });
        generateGrid();
        renderGrid();
    }

    // Start game
    function startGame() {
        gameStarted = true;
        startTimer();
        document.getElementById('startBtn').innerHTML = '<i class="fas fa-play"></i> Jeu en Cours...';
        document.getElementById('startBtn').disabled = true;
    }

    // Export PDF function
    async function exportToPDF() {
        const { jsPDF } = window.jspdf;
        try {
            document.querySelectorAll('.no-print').forEach(el => {
                el.style.display = 'none';
            });
            const wordListContainer = document.querySelector('.word-list-container');
            const mysteryWordSection = document.getElementById('mysteryWordSection');
            const originalStyles = {
                maxHeight: wordListContainer.style.maxHeight,
            };
            wordListContainer.style.maxHeight = 'none';
            wordListContainer.style.height = 'auto';
            mysteryWordSection.style.display = foundWords.size === allWords.length ? 'block' : 'none';
            await new Promise(resolve => setTimeout(resolve, 100));
            const canvas = await html2canvas(document.body, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            wordListContainer.style.maxHeight = originalStyles.maxHeight;
            wordListContainer.style.height = '';
            document.querySelectorAll('.no-print').forEach(el => {
                el.style.display = '';
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 0;
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            pdf.save(pdfName);
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de l\'export PDF. Utilisez la fonction d\'impression de votre navigateur.');
        }
    }

    // Initialize game
    updateVisitorCount();
    generateGrid();
    renderGrid();
    renderWordLists();
    updateGameStats();

    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('showSolutionBtn').addEventListener('click', showSolution);
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('submitMysteryWord').addEventListener('click', validateMysteryWord);
    document.addEventListener('selectstart', e => {
        if (isSelecting) e.preventDefault();
    });
}