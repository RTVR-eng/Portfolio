'use strict';

var tetrominos = [{
    // box
    colors : ['rgb(59,84,165)', 'rgb(118,137,196)', 'rgb(79,111,182)'],
    data : [[0, 0, 0, 0],
         [0, 1, 1, 0],
         [0, 1, 1, 0],
         [0, 0, 0, 0]]
    },
    {
    // stick
    colors : ['rgb(214,30,60)', 'rgb(241,108,107)', 'rgb(236,42,75)'],
    data : [[0, 0, 0, 0],
         [0, 0, 0, 0],
         [1, 1, 1, 1],
         [0, 0, 0, 0]]
    },
    {
    // z
    colors : ['rgb(88,178,71)', 'rgb(150,204,110)', 'rgb(115,191,68)'],
    data : [[0, 0, 0, 0],
         [0, 1, 1, 0],
         [0, 0, 1, 1],
         [0, 0, 0, 0]]
    },
    {
    // T
    colors : ['rgb(62,170,212)', 'rgb(120,205,244)', 'rgb(54,192,240)'],
    data : [[0, 0, 0, 0],
         [0, 1, 1, 1],
         [0, 0, 1, 0],
         [0, 0, 0, 0]]
    },
    {
    // s
    colors : ['rgb(236,94,36)', 'rgb(234,154,84)', 'rgb(228,126,37)'],
    data : [[0, 0, 0, 0],
         [0, 1, 1, 0],
         [1, 1, 0, 0],
         [0, 0, 0, 0]]
    },
    {
    // backwards L
    colors : ['rgb(220,159,39)', 'rgb(246,197,100)', 'rgb(242,181,42)'],
    data : [[0, 0, 1, 0],
          [0, 0, 1, 0],
          [0, 1, 1, 0],
          [0, 0, 0, 0]]
    },
    {
    // L
    colors : ['rgb(158,35,126)', 'rgb(193,111,173)', 'rgb(179,63,151)'],
    data : [[0, 1, 0, 0],
         [0, 1, 0, 0],
         [0, 1, 1, 0],
         [0, 0, 0, 0]]
    }];

var Tetris = function(x,y,width,height){
    this.posX = x || 0;
    this.posY = y || 0;

    this.width  = width || window.innerWidth;
    // Default height is the full document height so pieces stack at the bottom of the page
    var docHeight = (typeof document !== 'undefined') ? Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0, window.innerHeight) : window.innerHeight;
    this.height = (typeof height !== 'undefined' && height) ? height : docHeight;

    this.bgCanvas = document.createElement('canvas');
    this.fgCanvas = document.createElement('canvas');

    this.bgCanvas.width = this.fgCanvas.width = this.width;
    this.bgCanvas.height = this.fgCanvas.height = this.height;

    this.bgCtx = this.bgCanvas.getContext('2d');
    this.fgCtx = this.fgCanvas.getContext('2d');

    this.bgCanvas.style.left = this.posX + 'px';
    this.bgCanvas.style.top = this.posY + 'px';

    this.fgCanvas.style.left = this.posX + 'px';
    this.fgCanvas.style.top = this.posY + 'px';

    // Assign CSS classes for presentation (position, z-index, pointer behavior)
    this.bgCanvas.className = 'tetris-bg';
    this.fgCanvas.className = 'tetris-fg';

    document.body.appendChild(this.bgCanvas);
    document.body.appendChild(this.fgCanvas);
    // Register instance globally so external UI can control it at runtime
    if (typeof window !== 'undefined') {
        window.TETRIS_INSTANCES = window.TETRIS_INSTANCES || [];
        window.TETRIS_INSTANCES.push(this);

        // Setup a single global handler (once) to refresh instance sizes when
        // the document size changes (resize or DOM mutations). Uses a debounce.
        if (!window._TETRIS_SIZE_HANDLER_SETUP) {
            window._TETRIS_SIZE_HANDLER_SETUP = true;
            var _tetris_size_timeout = null;
            var _tetris_refresh = function () {
                if (_tetris_size_timeout) clearTimeout(_tetris_size_timeout);
                _tetris_size_timeout = setTimeout(function () {
                    var instances = window.TETRIS_INSTANCES || [];
                    instances.forEach(function (inst) {
                        if (inst && typeof inst.updateSizeFromDocument === 'function') {
                            inst.updateSizeFromDocument();
                        }
                    });
                }, 150);
            };

            window.addEventListener('resize', _tetris_refresh);
            try {
                var mo = new MutationObserver(_tetris_refresh);
                mo.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true });
                window._TETRIS_SIZE_OBSERVER = mo;
            } catch (e) {
                // MutationObserver may not be available in some environments — ignore
            }
        }
    }
    this.init();
};

Tetris.prototype.init = function(){
    this.curPiece = {
        data : null,
        colors : [0,0,0],
        x : 0,
        y : 0,
    };

    this.lastMove = Date.now();
        this.curSpeed = 50 + Math.random() * 50;
        // Record baseSpeed and apply global speed factor (default 1.3 => 30% slower)
        this.baseSpeed = this.curSpeed;
        var speedFactor = (typeof window !== 'undefined' && window.TETRIS_SPEED_FACTOR) ? window.TETRIS_SPEED_FACTOR : 1.3;
        this.curSpeed = this.baseSpeed * speedFactor;
    this.unitSize = 20;
    this.linesCleared = 0;
    this.level = 0;
    this.loseBlock = 0;

    // init the board
    this.board = [];
    this.boardWidth =  Math.floor(this.width / this.unitSize);
    this.boardHeight = Math.floor(this.height / this.unitSize);

    var board       = this.board,
        boardWidth  = this.boardWidth,
        boardHeight = this.boardHeight,
        halfHeight  = boardHeight/2,
        curPiece    = this.curPiece,
        x = 0, y = 0;

    // Control whether the board is pre-populated with blocks.
    // By default start empty (no blocks). To enable prepopulation, set
    // `window.TETRIS_PREPOPULATE = true` before this script runs.
    var prepopulate = (typeof window !== 'undefined' && typeof window.TETRIS_PREPOPULATE !== 'undefined') ? window.TETRIS_PREPOPULATE : false;

     // init board
    for (x = 0; x <= boardWidth; x++) {
        board[x] = [];
        for (y = 0; y <= boardHeight; y++) {

             board[x][y] = {
                data: 0,
                colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)']
            };

            // Add invisible floor at the bottom (boardHeight - 1) that acts as a wall
            if (y === boardHeight) {
                board[x][y] = {
                    data: 1,
                    colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'],
                    isWall: true  // Mark as wall so it doesn't contribute to line clears or scoring
                };
            }

            if(prepopulate && Math.random() > 0.15 && y > halfHeight){
                board[x][y] = {
                    data: 1,
                    colors: tetrominos[Math.floor(Math.random() * tetrominos.length)].colors
                };
            }
        }
    }

    // collapse the board a bit
    for (x = 0; x <= boardWidth; x++) {
        for (y = boardHeight-1; y > -1; y--) {

            if(board[x][y].data === 0 && y > 0){
                for(var yy = y; yy > 0; yy--){
                    if(board[x][yy-1].data){

                        board[x][yy].data = 1;
                        board[x][yy].colors = board[x][yy-1].colors;

                        board[x][yy-1].data = 0;
                        board[x][yy-1].colors = ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'];
                    }
                } 
            }
        }
    }

    var self = this;

    window.addEventListener('keydown', function (e) {
        switch (e.keyCode) {
            case 37:
                if (self.checkMovement(curPiece, -1, 0)) {
                    curPiece.x--;
                }
                break;
            case 39:
                if (self.checkMovement(curPiece, 1, 0)) {
                    curPiece.x++;
                }
                break;
            case 40:
                if (self.checkMovement(curPiece, 0, 1)) {
                    curPiece.y++;
                }
                break;
            case 32:
            case 38:
                curPiece.data = self.rotateTetrimono(curPiece);
                break;
            }
    });

    // render the board
    this.checkLines();
    this.renderBoard();

    // assign the first tetri
    this.newTetromino();
    this.update();
};


Tetris.prototype.update = function() {
    var curPiece = this.curPiece;

   if (!this.checkMovement(curPiece, 0, 1)) {
       if (curPiece.y < -1) {
           // you lose
           this.loseScreen();
           return true;
       } else {
           this.fillBoard(curPiece);
           this.newTetromino();
       }
   } else {
       if (Date.now() > this.lastMove) {
           this.lastMove = Date.now() + this.curSpeed;
           if (this.checkMovement(curPiece, 0, 1)) {
               curPiece.y++;
           } else {
               this.fillBoard(curPiece);
               this.newTetromino();
           }
       }
   }

   this.render();

   var self = this;
   requestAnimationFrame(function(){self.update();});
};

// render only the board.
Tetris.prototype.renderBoard = function(){
    var canvas      = this.bgCanvas,
        ctx         = this.bgCtx,
        unitSize    = this.unitSize,
        board       = this.board,
        boardWidth  = this.boardWidth,
        boardHeight = this.boardHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var x = 0; x <= boardWidth; x++) {
        for (var y = 0; y <= boardHeight; y++) {
            if (board[x][y].data !== 0 && !board[x][y].isWall) {
                var bX = (x * unitSize),
                    bY = (y * unitSize);

                // Only draw if block is within the playable box area
                // Canvas coords: bX, bY; Absolute page coords: posX + bX, posY + bY
                var absX = this.posX + bX;
                var absY = this.posY + bY;
                if (absX >= this.posX && absX < (this.posX + this.width) && absY >= this.posY && absY < (this.posY + this.height)) {
                    ctx.fillStyle = board[x][y].colors[0];
                    ctx.fillRect(bX, bY, unitSize, unitSize);

                    ctx.fillStyle = board[x][y].colors[1];
                    ctx.fillRect(bX+2, bY+2, unitSize-4, unitSize-4);

                    ctx.fillStyle = board[x][y].colors[2];
                    ctx.fillRect(bX+4, bY+4, unitSize-8, unitSize-8);
                }
            }
        }
   }
};

// Render the current active piece
Tetris.prototype.render = function() {
    var canvas      = this.fgCanvas,
        ctx         = this.fgCtx,
        unitSize    = this.unitSize,
        curPiece    = this.curPiece;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var x = 0; x < 4; x++) {
       for (var y = 0; y < 4; y++) {
           if (curPiece.data[x][y] === 1) {
               var xPos = ((curPiece.x + x) * unitSize),
                   yPos = ((curPiece.y + y) * unitSize);

               // Only draw if piece block is within canvas bounds (0 to width/height)
               if (xPos >= 0 && xPos < this.width && yPos >= 0 && yPos < this.height) {
                    ctx.fillStyle = curPiece.colors[0];
                    ctx.fillRect(xPos, yPos, unitSize, unitSize);

                    ctx.fillStyle = curPiece.colors[1];
                    ctx.fillRect(xPos+2, yPos+2, unitSize-4, unitSize-4);

                    ctx.fillStyle = curPiece.colors[2];
                    ctx.fillRect(xPos+4, yPos+4, unitSize-8, unitSize-8);
               }
           }
       }
    }
};

// Make sure we can mov where we want.
Tetris.prototype.checkMovement = function(curPiece, newX, newY) {
    var piece       = curPiece.data,
        posX        = curPiece.x,
        posY        = curPiece.y,
        board       = this.board,
        boardWidth  = this.boardWidth,
        boardHeight = this.boardHeight;

   for (var x = 0; x < 4; x++) {
       for (var y = 0; y < 4; y++) {
           if (piece[x][y] === 1) {
               var newBoardX = posX + x + newX;
               var newBoardY = posY + y + newY;

               // Check bounds first - piece cannot move outside board
               if (newBoardX < 0 || newBoardX >= boardWidth || newBoardY > boardHeight) {
                   return false;
               }

               // Check if position is occupied (only check if within valid board range)
               if (newBoardY >= 0 && board[newBoardX] && board[newBoardX][newBoardY] && board[newBoardX][newBoardY].data === 1) {
                   return false;
               }
           }
       }
   }
   return true;
};

// checks for completed lines and clears them
Tetris.prototype.checkLines = function() {
    var board           = this.board,
        boardWidth      = this.boardWidth,
        boardHeight     = this.boardHeight,
        linesCleared    = this.linesCleared,
        level           = this.level,
        y               = boardHeight;  // Don't check the wall row (boardHeight)

   while (y-- > 0) {  // Only check rows above the wall
       var x = boardWidth,
           lines = 0;

       while (x--) {
           if (board[x][y].data === 1 && !board[x][y].isWall) {
               lines++;
           }
       }

       if (lines === boardWidth) {
           linesCleared++;
           level = Math.round(linesCleared / 20) * 20;

           var lineY = y;
           while (lineY > 0) {  // Don't move data into the wall row
               for (x = 0; x <= boardWidth; x++) {
                   board[x][lineY].data = board[x][lineY - 1].data;
                   board[x][lineY].colors = board[x][lineY - 1].colors;
                   board[x][lineY].isWall = board[x][lineY - 1].isWall;
               }
               lineY--;
           }
           y++;
       }
   }
};

// Lose animation - stop the game but don't auto-reset
Tetris.prototype.loseScreen = function() {
    var ctx         = this.bgCtx,
        unitSize    = this.unitSize,
        boardWidth  = this.boardWidth,
        boardHeight = this.boardHeight,
        y           = boardHeight - this.loseBlock;

    for(var x = 0; x < boardWidth; x++){
        var bX = (x * unitSize),
            bY = (y * unitSize);

        ctx.fillStyle = 'rgb(80,80,80)';
        ctx.fillRect(bX, bY, unitSize, unitSize);

        ctx.fillStyle = 'rgb(150,150,150)';
        ctx.fillRect(bX+2, bY+2, unitSize-4, unitSize-4);

        ctx.fillStyle = 'rgb(100,100,100)';
        ctx.fillRect(bX+4, bY+4, unitSize-8, unitSize-8);
    }

    if(this.loseBlock <= (boardHeight+1)){
        this.loseBlock++;

        var self = this;
        requestAnimationFrame(function(){self.loseScreen();});
    }
    // Game over - blocks remain on screen until user presses Reset button
};

// adds the piece as part of the board
Tetris.prototype.fillBoard = function(curPiece) {
    var piece = curPiece.data,
        posX  = curPiece.x,
        posY  = curPiece.y,
        board = this.board;

    for (var x = 0; x < 4; x++) {
       for (var y = 0; y < 4; y++) {
           if (piece[x][y] === 1) {
               var bx = x + posX;
               var by = y + posY;
               // Only place block if it's within board bounds
               if (bx >= 0 && bx < this.boardWidth && by >= 0 && by < this.boardHeight) {
                   if (!board[bx]) board[bx] = [];
                   board[bx][by] = board[bx][by] || { data: 0, colors: ['rgb(0,0,0)','rgb(0,0,0)','rgb(0,0,0)'] };
                   board[bx][by].data = 1;
                   board[bx][by].colors = curPiece.colors;
               }
           }
       }
    }

    // Award points for placing this piece
    this.incrementScore(10);

    this.checkLines();
    this.renderBoard();
}

// Set whether this board is prepopulated with random blocks.
Tetris.prototype.setPrepopulate = function(enable) {
    var board = this.board,
        boardWidth = this.boardWidth,
        boardHeight = this.boardHeight,
        halfHeight = boardHeight / 2;

    for (var x = 0; x <= boardWidth; x++) {
        for (var y = 0; y <= boardHeight; y++) {
            if (enable && Math.random() > 0.15 && y > halfHeight) {
                board[x][y].data = 1;
                board[x][y].colors = tetrominos[Math.floor(Math.random() * tetrominos.length)].colors;
            } else {
                board[x][y].data = 0;
                board[x][y].colors = ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'];
            }
        }
    }

    this.renderBoard();
};

// Increment score by awarding points for placed pieces
Tetris.prototype.incrementScore = function(points) {
    if (typeof window !== 'undefined' && typeof window.TETRIS_SCORE !== 'undefined') {
        window.TETRIS_SCORE += (points || 10);
        var scoreValue = document.getElementById('tetris-score-value');
        if (scoreValue) scoreValue.textContent = window.TETRIS_SCORE;
    }
};

// Reset the board to empty (clears all placed blocks) and re-render.
Tetris.prototype.resetBoard = function() {
    var board = this.board,
        boardWidth = this.boardWidth,
        boardHeight = this.boardHeight;

    // Clear all blocks
    for (var x = 0; x <= boardWidth; x++) {
        if (!board[x]) board[x] = [];
        for (var y = 0; y <= boardHeight; y++) {
            if (y === boardHeight) {
                // Restore the invisible floor
                board[x][y] = {
                    data: 1,
                    colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'],
                    isWall: true
                };
            } else {
                board[x][y] = {
                    data: 0,
                    colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)']
                };
            }
        }
    }

    // Reset game state
    this.curPiece = {
        data: null,
        colors: [0, 0, 0],
        x: 0,
        y: 0
    };
    this.lastMove = Date.now();
    this.curSpeed = 50 + Math.random() * 50;
    this.baseSpeed = this.curSpeed;
    var speedFactor = (typeof window !== 'undefined' && window.TETRIS_SPEED_FACTOR) ? window.TETRIS_SPEED_FACTOR : 1.3;
    this.curSpeed = this.baseSpeed * speedFactor;
    this.linesCleared = 0;
    this.level = 0;
    this.loseBlock = 0;

    // Clear the lose screen overlay from canvas
    this.fgCtx.clearRect(0, 0, this.fgCanvas.width, this.fgCanvas.height);
    
    // Check for lines and render board (same as init)
    this.checkLines();
    this.renderBoard();
    
    // Spawn a new piece
    this.newTetromino();
    
    // Restart the game loop
    var self = this;
    requestAnimationFrame(function(){self.update();});
};

// Adjust board and canvas sizes, preserving existing blocks where possible.
Tetris.prototype.adjustSize = function(newWidth, newHeight) {
    var oldWidth = this.width,
        oldHeight = this.height,
        oldBoardWidth = this.boardWidth,
        oldBoardHeight = this.boardHeight;

    // If nothing changed, skip
    if (newWidth === oldWidth && newHeight === oldHeight) return;

    this.width = newWidth || this.width;
    this.height = newHeight || this.height;

    // Resize canvas pixel buffers
    this.bgCanvas.width = this.fgCanvas.width = this.width;
    this.bgCanvas.height = this.fgCanvas.height = this.height;

    // Recompute board dimensions
    this.boardWidth = Math.floor(this.width / this.unitSize);
    this.boardHeight = Math.floor(this.height / this.unitSize);

    // Ensure board array exists
    this.board = this.board || [];

    // Adjust number of columns (x)
    if (this.boardWidth >= oldBoardWidth) {
        for (var x = 0; x <= this.boardWidth; x++) {
            if (!this.board[x]) this.board[x] = [];
        }
    } else {
        // Trim extra columns
        this.board.length = this.boardWidth + 1;
    }

    // Adjust rows for each column, preserving existing data where possible
    for (var xi = 0; xi <= this.boardWidth; xi++) {
        var col = this.board[xi] || [];
        // extend
        if (col.length <= this.boardHeight) {
            for (var y = col.length; y <= this.boardHeight; y++) {
                col[y] = { data: 0, colors: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'] };
            }
        } else {
            // trim
            col.length = this.boardHeight + 1;
        }
        this.board[xi] = col;
    }

    // Re-render after resizing
    try {
        this.renderBoard();
        this.render();
    } catch (e) {
        // ignore render errors
    }
};

// Recompute size based on document dimensions and apply via adjustSize
Tetris.prototype.updateSizeFromDocument = function() {
    var docHeight = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0, window.innerHeight);
    // Keep instance width as-is (instances may be designed for a fixed width)
    this.adjustSize(this.width, docHeight);
};

// rotate a piece
Tetris.prototype.rotateTetrimono = function(curPiece) {
   var rotated = [];

   for (var x = 0; x < 4; x++) {
       rotated[x] = [];
       for (var y = 0; y < 4; y++) {
           rotated[x][y] = curPiece.data[3 - y][x];
       }
   }

   if (!this.checkMovement({
       data: rotated,
       x: curPiece.x,
       y: curPiece.y
   }, 0, 0)) {
       rotated = curPiece.data;
   }

   return rotated;
};

// assign the player a new peice
Tetris.prototype.newTetromino = function() {
    var pieceNum = Math.floor(Math.random() * tetrominos.length),
        curPiece = this.curPiece;

    curPiece.data    = tetrominos[pieceNum].data;
    curPiece.colors  = tetrominos[pieceNum].colors;
    // Spawn piece in center, constrained to board width
    var centerX = Math.floor((this.boardWidth - 4) / 2);
    centerX = Math.max(0, Math.min(centerX, this.boardWidth - 4));
    curPiece.x = centerX;
    curPiece.y = -4;
};
