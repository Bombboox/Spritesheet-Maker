const rowsInput = document.getElementById('rows');
const columnsInput = document.getElementById('columns');
const cellWidthInput = document.getElementById('cellWidth');
const cellHeightInput = document.getElementById('cellHeight');
const paddingInput = document.getElementById('padding');
const bgColorInput = document.getElementById('bgColor');
const bgAlphaInput = document.getElementById('bgAlpha');
const alphaValueDisplay = document.getElementById('alphaValue');
const transparentBgCheckbox = document.getElementById('transparentBg');
const multiSelectCheckbox = document.getElementById('multiSelect');
const applySettingsBtn = document.getElementById('applySettings');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const thumbnailsContainer = document.getElementById('thumbnails');
const canvas = document.getElementById('spriteCanvas');
const ctx = canvas.getContext('2d');
const clearCanvasBtn = document.getElementById('clearCanvas');
const exportBtn = document.getElementById('exportSpritesheet');
const exportJsonBtn = document.getElementById('exportJson');
const importBtn = document.getElementById('importSpritesheet');
const importFileInput = document.createElement('input');
importFileInput.type = 'file';
importFileInput.accept = 'image/*';
importFileInput.style.display = 'none';
document.body.appendChild(importFileInput);
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');
const canvasContainer = document.querySelector('.canvas-container');
const donateBtn = document.getElementById('donateBtn');
const exportTypeInput = document.getElementById('exportType');

let rows = 4;
let columns = 4;
let cellWidth = 64;
let cellHeight = 64;
let padding = 2;
let bgColor = '#333333';
let bgAlpha = 1;
let uploadedImages = [];
let selectedImages = [];
let grid = [];
let isDragging = false;
let draggedImage = null;
let dragStartX = 0;
let dragStartY = 0;
let zoomLevel = 1;
let hoveredCell = null;
let isPanning = false;
let panOffsetX = 0;
let panOffsetY = 0;
let panStartX = 0;
let panStartY = 0;
let isMultiSelecting = false;
let selectionStartCell = null;
let selectionEndCell = null;
let isErasing = false;
let imageIdCounter = 1; // Counter for assigning unique IDs to images
let imageIdMap = {}; // Map to store image IDs and their names

function initGrid() {
    rows = parseInt(rowsInput.value);
    columns = parseInt(columnsInput.value);
    cellWidth = parseInt(cellWidthInput.value);
    cellHeight = parseInt(cellHeightInput.value);
    padding = parseInt(paddingInput.value);
    bgColor = bgColorInput.value;
    bgAlpha = parseFloat(bgAlphaInput.value);
    
    if (transparentBgCheckbox.checked) {
        bgAlpha = 0;
    }
    
    canvas.width = columns * cellWidth + (columns + 1) * padding;
    canvas.height = rows * cellHeight + (rows + 1) * padding;
    
    fitCanvasToContainer();
    
    grid = new Array(rows);
    for (let i = 0; i < rows; i++) {
        grid[i] = new Array(columns).fill(null);
    }
    
    drawGrid();
}

function fitCanvasToContainer() {
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = canvasContainer.clientHeight;
    
    const canvasRatio = canvas.width / canvas.height;
    const containerRatio = containerWidth / containerHeight;
    
    let scale = 1;
    
    if (canvasRatio > containerRatio) {
        scale = containerWidth / canvas.width;
    } else {
        scale = containerHeight / canvas.height;
    }
    
    if (scale < 1) {
        zoomLevel = scale;
        applyZoom();
    } else {
        zoomLevel = 1;
        applyZoom();
    }
    
    // Reset pan offset when fitting canvas
    panOffsetX = 0;
    panOffsetY = 0;
}

function applyZoom() {
    canvas.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px) scale(${zoomLevel})`;
    canvas.style.transformOrigin = "0 0";
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const hexColor = bgColor;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bgAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const x = padding + col * (cellWidth + padding);
            const y = padding + row * (cellHeight + padding);
            
            // Highlight the cell if it's being hovered over
            if (hoveredCell && hoveredCell.row === row && hoveredCell.col === col) {
                ctx.fillStyle = 'rgba(74, 107, 175, 0.3)'; // Highlight color (accent color with transparency)
                ctx.fillRect(x, y, cellWidth, cellHeight);
                
                // Draw a border around the highlighted cell
                ctx.strokeStyle = 'rgba(74, 107, 175, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, cellWidth, cellHeight);
            } else if (isMultiSelecting && isInSelectionArea(row, col)) {
                // Highlight cells in the selection area
                if (isErasing) {
                    ctx.fillStyle = 'rgba(255, 75, 75, 0.3)'; // Red highlight for erasing
                } else {
                    ctx.fillStyle = 'rgba(74, 107, 175, 0.3)'; // Blue highlight for placing
                }
                ctx.fillRect(x, y, cellWidth, cellHeight);
                
                // Draw a border around the selected cell
                if (isErasing) {
                    ctx.strokeStyle = 'rgba(255, 75, 75, 0.8)';
                } else {
                    ctx.strokeStyle = 'rgba(74, 107, 175, 0.8)';
                }
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, cellWidth, cellHeight);
            } else {
                ctx.fillStyle = 'rgba(68, 68, 68, 0.5)';
                ctx.fillRect(x, y, cellWidth, cellHeight);
            }
            
            if (grid[row][col]) {
                const img = grid[row][col];
                drawImageInCell(img, row, col);
            }
        }
    }
    
    if (isDragging && draggedImage) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        const aspectRatio = draggedImage.width / draggedImage.height;
        let width = cellWidth * 0.8;
        let height = width / aspectRatio;
        
        if (height > cellHeight * 0.8) {
            height = cellHeight * 0.8;
            width = height * aspectRatio;
        }
        
        // Adjust position to account for zoom and pan
        const adjustedX = dragStartX;
        const adjustedY = dragStartY;
        
        ctx.drawImage(
            draggedImage,
            adjustedX - width / 2,
            adjustedY - height / 2,
            width,
            height
        );
        ctx.restore();
    }
}

function isInSelectionArea(row, col) {
    if (!selectionStartCell || !selectionEndCell) return false;
    
    const minRow = Math.min(selectionStartCell.row, selectionEndCell.row);
    const maxRow = Math.max(selectionStartCell.row, selectionEndCell.row);
    const minCol = Math.min(selectionStartCell.col, selectionEndCell.col);
    const maxCol = Math.max(selectionStartCell.col, selectionEndCell.col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
}

function drawImageInCell(img, row, col) {
    const x = padding + col * (cellWidth + padding);
    const y = padding + row * (cellHeight + padding);
    
    const aspectRatio = img.width / img.height;
    let width = cellWidth;
    let height = cellHeight;
    
    // Maintain aspect ratio while filling the cell
    if (aspectRatio > 1) {
        // Wider than tall
        height = width / aspectRatio;
    } else {
        // Taller than wide
        width = height * aspectRatio;
    }
    
    const centerX = x + (cellWidth - width) / 2;
    const centerY = y + (cellHeight - height) / 2;
    
    ctx.drawImage(img, centerX, centerY, width, height);
}

function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                
                img.onload = function() {
                    // Assign a unique ID to the image
                    img.id = imageIdCounter;
                    // Store the image name in the map
                    imageIdMap[imageIdCounter] = file.name || `image_${imageIdCounter}`;
                    imageIdCounter++;
                    
                    uploadedImages.push(img);
                    createThumbnail(img, uploadedImages.length - 1);
                };
            };
            
            reader.readAsDataURL(file);
        }
    }
}

function createThumbnail(img, index) {
    const thumbnail = document.createElement('div');
    thumbnail.className = 'thumbnail';
    
    const imgElement = document.createElement('img');
    imgElement.src = img.src;
    
    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        uploadedImages.splice(index, 1);
        thumbnailsContainer.removeChild(thumbnail);
        updateThumbnailIndexes();
    });
    
    thumbnail.appendChild(imgElement);
    thumbnail.appendChild(removeBtn);
    
    thumbnail.addEventListener('click', function(e) {
        selectedImages = [img];
        draggedImage = img;
        
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('selected');
        });
        thumbnail.classList.add('selected');
    });
    
    thumbnailsContainer.appendChild(thumbnail);
}

function updateThumbnailIndexes() {
    const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumbnail, index) => {
        const removeBtn = thumbnail.querySelector('.remove');
        removeBtn.onclick = function(e) {
            e.stopPropagation();
            uploadedImages.splice(index, 1);
            thumbnailsContainer.removeChild(thumbnail);
            updateThumbnailIndexes();
        };
        
        thumbnail.onclick = function(e) {
            if (multiSelectCheckbox.checked) {
                const img = uploadedImages[index];
                const imgIndex = selectedImages.indexOf(img);
                if (imgIndex === -1) {
                    selectedImages.push(img);
                    thumbnail.classList.add('selected');
                } else {
                    selectedImages.splice(imgIndex, 1);
                    thumbnail.classList.remove('selected');
                }
            } else {
                selectedImages = [uploadedImages[index]];
                draggedImage = uploadedImages[index];
                
                document.querySelectorAll('.thumbnail').forEach(thumb => {
                    thumb.classList.remove('selected');
                });
                thumbnail.classList.add('selected');
            }
        };
    });
}

function getCellFromCoords(x, y) {
    // Convert mouse coordinates to canvas coordinates accounting for zoom and pan
    const scaledX = x / zoomLevel;
    const scaledY = y / zoomLevel;
    
    // Calculate cell position based on scaled coordinates
    const col = Math.floor((scaledX - padding) / (cellWidth + padding));
    const row = Math.floor((scaledY - padding) / (cellHeight + padding));
    
    // Check if the calculated cell is within the grid bounds
    if (row >= 0 && row < rows && col >= 0 && col < columns) {
        // Verify the point is actually within the cell and not in padding
        const cellX = padding + col * (cellWidth + padding);
        const cellY = padding + row * (cellHeight + padding);
        
        if (
            scaledX >= cellX && 
            scaledX < cellX + cellWidth && 
            scaledY >= cellY && 
            scaledY < cellY + cellHeight
        ) {
            return { row, col };
        }
    }
    
    return null;
}

function placeImagesInSequence(startRow, startCol) {
    let currentRow = startRow;
    let currentCol = startCol;
    
    for (let i = 0; i < selectedImages.length; i++) {
        if (currentRow < rows && currentCol < columns) {
            grid[currentRow][currentCol] = selectedImages[i];
            
            currentCol++;
            if (currentCol >= columns) {
                currentCol = 0;
                currentRow++;
            }
        }
    }
    
    drawGrid();
}

function placeImagesInArea() {
    if (!selectionStartCell || !selectionEndCell || selectedImages.length === 0) return;
    
    const minRow = Math.min(selectionStartCell.row, selectionEndCell.row);
    const maxRow = Math.max(selectionStartCell.row, selectionEndCell.row);
    const minCol = Math.min(selectionStartCell.col, selectionEndCell.col);
    const maxCol = Math.max(selectionStartCell.col, selectionEndCell.col);
    
    if (isErasing) {
        // Erase images in the selection area
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                grid[row][col] = null;
            }
        }
    } else {
        // Place images in the selection area
        const selectedImage = selectedImages[0];
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                grid[row][col] = selectedImage;
            }
        }
    }
    
    drawGrid();
}

function exportType() {
    if (exportTypeInput.value === 'image') {
        exportSpritesheet();
    } else if (exportTypeInput.value === 'json') {
        exportJson();
    }
}

function exportSpritesheet() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    const totalWidth = columns * cellWidth + (columns + 1) * padding;
    const totalHeight = rows * cellHeight + (rows + 1) * padding;
    tempCanvas.width = totalWidth;
    tempCanvas.height = totalHeight;
    
    const hexColor = bgColor;
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    tempCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${bgAlpha})`;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            const x = padding + col * (cellWidth + padding);
            const y = padding + row * (cellHeight + padding);
            
            if (grid[row][col]) {
                const img = grid[row][col];
                const aspectRatio = img.width / img.height;
                let width = cellWidth;
                let height = cellHeight;
                
                // Maintain aspect ratio while filling the cell
                if (aspectRatio > 1) {
                    // Wider than tall
                    height = width / aspectRatio;
                } else {
                    // Taller than wide
                    width = height * aspectRatio;
                }
                
                const centerX = x + (cellWidth - width) / 2;
                const centerY = y + (cellHeight - height) / 2;
                
                tempCtx.drawImage(img, centerX, centerY, width, height);
            }
        }
    }
    
    const link = document.createElement('a');
    link.download = 'spritesheet.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

function exportJson() {
    // Create the JSON structure
    const jsonData = {
        key: {},
        grid: []
    };
    
    // Add the key mapping IDs to image names
    for (const id in imageIdMap) {
        jsonData.key[id] = imageIdMap[id];
    }
    
    // Create the grid data
    for (let row = 0; row < rows; row++) {
        const rowArray = [];
        for (let col = 0; col < columns; col++) {
            if (grid[row][col]) {
                rowArray.push(grid[row][col].id);
            } else {
                rowArray.push(0); // 0 for empty space
            }
        }
        jsonData.grid.push(rowArray);
    }
    
    // Format the JSON with row labels
    let formattedJson = "{\n  \"key\": {\n";
    
    // Add the key section
    const keyEntries = Object.entries(jsonData.key);
    for (let i = 0; i < keyEntries.length; i++) {
        const [id, name] = keyEntries[i];
        formattedJson += `    "${id}": "${name}"${i < keyEntries.length - 1 ? ',' : ''}\n`;
    }
    
    formattedJson += "  },\n  \"grid\": {\n";
    
    // Add the grid section with row labels
    for (let i = 0; i < jsonData.grid.length; i++) {
        formattedJson += `    "row_${i + 1}": [${jsonData.grid[i].join(', ')}]${i < jsonData.grid.length - 1 ? ',' : ''}\n`;
    }
    
    formattedJson += "  }\n}";
    
    // Create a blob and download the JSON file
    const blob = new Blob([formattedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'spritesheet_data.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function importSpritesheet(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = function() {
            // Calculate how many sprites we can extract based on current grid settings
            const spriteWidth = cellWidth;
            const spriteHeight = cellHeight;
            const spritePadding = padding;
            
            // Create a temporary canvas to process the image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = spriteWidth;
            tempCanvas.height = spriteHeight;
            
            // Clear the grid before importing
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    grid[row][col] = null;
                }
            }
            
            // Extract each sprite from the spritesheet
            let spriteCount = 0;
            for (let row = 0; row < rows && row * (spriteHeight + spritePadding) < img.height; row++) {
                for (let col = 0; col < columns && col * (spriteWidth + spritePadding) < img.width; col++) {
                    // Calculate the position of this sprite in the original spritesheet
                    const srcX = col * (spriteWidth + spritePadding) + spritePadding;
                    const srcY = row * (spriteHeight + spritePadding) + spritePadding;
                    
                    // Skip if we're out of bounds
                    if (srcX + spriteWidth > img.width || srcY + spriteHeight > img.height) {
                        continue;
                    }
                    
                    // Clear the temp canvas
                    tempCtx.clearRect(0, 0, spriteWidth, spriteHeight);
                    
                    // Draw the sprite to the temp canvas
                    tempCtx.drawImage(
                        img,
                        srcX, srcY, spriteWidth, spriteHeight,
                        0, 0, spriteWidth, spriteHeight
                    );
                    
                    // Create a new image from the sprite
                    const spriteImg = new Image();
                    spriteImg.src = tempCanvas.toDataURL();
                    
                    // Add the sprite to our collection and place it in the grid
                    spriteImg.onload = function() {
                        // Assign a unique ID to the image
                        spriteImg.id = imageIdCounter;
                        // Store the image name in the map
                        imageIdMap[imageIdCounter] = `sprite_${imageIdCounter}`;
                        imageIdCounter++;
                        
                        uploadedImages.push(spriteImg);
                        createThumbnail(spriteImg, uploadedImages.length - 1);
                        grid[row][col] = spriteImg;
                        drawGrid();
                    };
                    
                    spriteCount++;
                }
            }
            
            if (spriteCount === 0) {
                alert('No sprites could be extracted with the current grid settings. Try adjusting the rows, columns, cell size, or padding.');
            }
        };
    };
    
    reader.readAsDataURL(file);
}

function startPanning(e) {
    isPanning = true;
    panStartX = e.clientX - panOffsetX;
    panStartY = e.clientY - panOffsetY;
    canvas.style.cursor = 'grabbing';
}

function updatePanning(e) {
    if (isPanning) {
        panOffsetX = e.clientX - panStartX;
        panOffsetY = e.clientY - panStartY;
        applyZoom();
    }
}

function stopPanning() {
    isPanning = false;
    canvas.style.cursor = 'default';
}

function donateWithPaypal() {
    // Get the donation amount from the input field
    const donationAmount = document.getElementById('donationAmount').value;
    
    // Validate the amount
    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid donation amount.');
        return;
    }
    
    // Open PayPal with the specified amount
    window.open(`https://www.paypal.com/donate/?business=U2K8REXZE7YJU&no_recurring=0&item_name=Support+the+creator%21&currency_code=USD&amount=${amount}`, '_blank');
}

applySettingsBtn.addEventListener('click', initGrid);

document.addEventListener('contextmenu', event => event.preventDefault());

uploadArea.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.style.borderColor = '#4a6baf';
});

uploadArea.addEventListener('dragleave', function() {
    this.style.borderColor = '#3a3a3a';
});

uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    this.style.borderColor = '#3a3a3a';
    handleFiles(e.dataTransfer.files);
});

bgAlphaInput.addEventListener('input', function() {
    bgAlpha = parseFloat(this.value);
    alphaValueDisplay.textContent = Math.round(bgAlpha * 100) + '%';
    if (bgAlpha === 0) {
        transparentBgCheckbox.checked = true;
    } else {
        transparentBgCheckbox.checked = false;
    }
    drawGrid();
});

transparentBgCheckbox.addEventListener('change', function() {
    if (this.checked) {
        bgAlpha = 0;
        bgAlphaInput.value = 0;
        alphaValueDisplay.textContent = '0%';
    } else {
        bgAlpha = 1;
        bgAlphaInput.value = 1;
        alphaValueDisplay.textContent = '100%';
    }
    drawGrid();
});

// Prevent context menu on canvas
canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isPanning) {
        updatePanning(e);
        return;
    }
    
    // Get cell coordinates accounting for zoom and pan
    const cell = getCellFromCoords(x, y);
    
    if (isMultiSelecting && cell) {
        selectionEndCell = cell;
        drawGrid();
        return;
    }
    
    // Only redraw if the hovered cell has changed
    if ((cell && !hoveredCell) || 
        (!cell && hoveredCell) || 
        (cell && hoveredCell && (cell.row !== hoveredCell.row || cell.col !== hoveredCell.col))) {
        hoveredCell = cell;
        drawGrid();
    }
    
    if (isDragging) {
        // Update drag position to be directly at cursor position, accounting for zoom and pan
        dragStartX = (e.clientX - rect.left) / zoomLevel;
        dragStartY = (e.clientY - rect.top) / zoomLevel;
        drawGrid();
    }
});

canvas.addEventListener('mouseout', function() {
    hoveredCell = null;
    drawGrid();
});

canvas.addEventListener('mousedown', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Middle mouse button or Alt+Left click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 2) {
        e.preventDefault();
        startPanning(e);
        return;
    }
    
    const cell = getCellFromCoords(x, y);
    if (!cell) return;
    
    // Check if Ctrl key is pressed for erasing mode
    isErasing = e.ctrlKey;
    
    if (e.button === 0 && selectedImages.length > 0 && !isErasing) {
        // Start multi-selection for placing images
        isMultiSelecting = true;
        selectionStartCell = cell;
        selectionEndCell = cell;
        drawGrid();
    } else if (e.button === 0 && isErasing) {
        // Start multi-selection for erasing
        isMultiSelecting = true;
        selectionStartCell = cell;
        selectionEndCell = cell;
        drawGrid();
    } else if (e.button === 0 && cell && grid[cell.row][cell.col]) {
        // Start dragging an existing image
        isDragging = true;
        draggedImage = grid[cell.row][cell.col];
        grid[cell.row][cell.col] = null;
        dragStartX = (x / zoomLevel);
        dragStartY = (y / zoomLevel);
        drawGrid();
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (isPanning) {
        stopPanning();
        return;
    }
    
    if (isMultiSelecting) {
        placeImagesInArea();
        isMultiSelecting = false;
        selectionStartCell = null;
        selectionEndCell = null;
        drawGrid();
        return;
    }
    
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const cell = getCellFromCoords(x, y);
        if (cell) {
            grid[cell.row][cell.col] = draggedImage;
        }
        
        isDragging = false;
        draggedImage = null;
        drawGrid();
    }
});

// Add event listeners for when mouse is released outside the canvas
document.addEventListener('mouseup', function() {
    if (isPanning) {
        stopPanning();
    }
    
    if (isMultiSelecting) {
        placeImagesInArea();
        isMultiSelecting = false;
        selectionStartCell = null;
        selectionEndCell = null;
        drawGrid();
    }
    
    if (isDragging) {
        isDragging = false;
        draggedImage = null;
        drawGrid();
    }
});

document.addEventListener('mousemove', function(e) {
    if (isPanning) {
        updatePanning(e);
    }
});

clearCanvasBtn.addEventListener('click', function() {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            grid[row][col] = null;
        }
    }
    drawGrid();
});

exportBtn.addEventListener('click', exportType);

if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', exportJson);
}

importBtn.addEventListener('click', function() {
    importFileInput.click();
});

importFileInput.addEventListener('change', function() {
    if (this.files.length > 0) {
        importSpritesheet(this.files[0]);
    }
    // Reset the input so the same file can be selected again
    this.value = '';
});

zoomInBtn.addEventListener('click', function() {
    zoomLevel = Math.min(zoomLevel * 1.2, 5);
    applyZoom();
});

zoomOutBtn.addEventListener('click', function() {
    zoomLevel = Math.max(zoomLevel / 1.2, 0.1);
    applyZoom();
});

zoomResetBtn.addEventListener('click', function() {
    panOffsetX = 0;
    panOffsetY = 0;
    fitCanvasToContainer();
});

if (donateBtn) {
    donateBtn.addEventListener('click', donateWithPaypal);
}

window.addEventListener('resize', fitCanvasToContainer);

window.addEventListener('load', function() {
    alphaValueDisplay.textContent = Math.round(bgAlpha * 100) + '%';
    initGrid();
});

canvasContainer.addEventListener('wheel', function(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
        zoomLevel = Math.min(zoomLevel * 1.1, 5);
    } else {
        zoomLevel = Math.max(zoomLevel / 1.1, 0.1);
    }
    applyZoom();
});