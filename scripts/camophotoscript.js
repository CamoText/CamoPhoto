// CamoPhoto Script
// Version 1.0.0
// Author: CamoText LLC
// Description: A simple tool to remove metadata from images

// Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const removeBtn = document.getElementById('removeBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const viewMetadataBtn = document.getElementById('viewMetadataBtn');
const fileName = document.getElementById('fileName');
const status = document.getElementById('status');
const downloadButtons = document.getElementById('downloadButtons');
const metadataPopup = document.getElementById('metadataPopup');
const metadataContent = document.getElementById('metadataContent');
const closeMetadataBtn = document.querySelector('.close-metadata');

let selectedFile = null;
let scrubbedBlob = null;
let originalExtension = '';

// Add mobile detection function at the top
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

function isBraveIOS() {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) && 
           navigator.userAgent.includes('Brave');
}

// Update the initialization of downloadButtons to handle mobile devices
function updateUIForMobile() {
    if (isMobileDevice()) {
        // On mobile, hide the Copy button and have the save button open the image in a new tab (or display below, if popups blocked)
        // if the browser supports the Clipboard API, enable a copy button to copy the image to the clipboard
        copyBtn.style.display = 'none';
        // Make the download button wider to fill the space
        downloadBtn.style.width = '100%';
        
        // Add mobile-specific instructions near the download button
        const mobileInfo = document.createElement('p');
        mobileInfo.innerHTML = 'On mobile devices, "Save" will open the image in a new tab';
        
        mobileInfo.style.background = 'var(--card-gradient-bg)';
        mobileInfo.style.padding = '0.5rem';
        mobileInfo.style.borderRadius = '6px';
        mobileInfo.style.fontSize = '0.85rem';
        mobileInfo.style.marginTop = '0.75rem';
        mobileInfo.style.marginBottom = '0.75rem';
        mobileInfo.style.textAlign = 'center';
        mobileInfo.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        
        // Insert after the downloadButtons container
        const downloadButtonsParent = downloadButtons.parentNode;
        downloadButtonsParent.insertBefore(mobileInfo, downloadButtons.nextSibling);
        
        // Create and add a Paste Image button for mobile
        const pasteBtn = document.createElement('button');
        pasteBtn.id = 'pasteImageBtn';
        pasteBtn.className = 'secondary-button';
        pasteBtn.innerHTML = '📋 Paste from Clipboard';
        pasteBtn.setAttribute('aria-label', 'Paste image from clipboard');
        pasteBtn.style.marginTop = '1rem';
        pasteBtn.style.marginBottom = '2rem';
        pasteBtn.style.width = '80%';
        pasteBtn.style.maxWidth = '300px';
        pasteBtn.style.display = 'block';
        pasteBtn.style.margin = '1.5rem auto 2rem auto';
        
        // Add the paste button to the dropzone after the heading text
        const dropZoneHeader = dropZone.querySelector('h4');
        dropZone.insertBefore(pasteBtn, dropZoneHeader.nextSibling);
        
        // Handle click on paste button, which triggers the clipboard API request
        pasteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Request clipboard read permission and access clipboard on mobile
            if (navigator.clipboard && navigator.clipboard.read) {
                navigator.clipboard.read()
                    .then(async (clipboardItems) => {
                        // Look through all clipboard items
                        for (const item of clipboardItems) {
                            // Check if any have image types
                            if (item.types.some(type => type.startsWith('image/'))) {
                                // Get the image type
                                const imageType = item.types.find(type => type.startsWith('image/'));
                                const blob = await item.getType(imageType);
                                
                                // Convert blob to file for processing
                                const fileName = `pasted-image.${imageType.split('/')[1] || 'png'}`;
                                const file = new File([blob], fileName, { type: imageType });
                                
                                // Process the file just like with other input methods
                                handleFile(file);
                                status.textContent = 'Image pasted successfully!';
                                
                                // Add visual feedback
                                dropZone.classList.add('dragover');
                                setTimeout(() => {
                                    dropZone.classList.remove('dragover');
                                }, 300);
                                
                                return;
                            }
                        }
                        status.textContent = 'No image found in clipboard.';
                    })
                    .catch(err => {
                        console.error('Clipboard access error:', err);
                        status.textContent = 'Could not access clipboard. You may need to grant permission.';
                    });
            } else {
                status.textContent = 'Clipboard access not supported in this browser.';
            }
        });
    }
}

// Call this after all DOM element references
updateUIForMobile();

// Add paste event handler to allow pasting images directly
document.addEventListener('paste', (e) => {
    e.preventDefault(); // Prevent the default paste behavior
    
    // Check if we have items in the clipboard
    if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        
        // Look for an image in the clipboard
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                // Get the image as a file
                const file = items[i].getAsFile();
                
                // Add visual feedback
                dropZone.classList.add('dragover');
                setTimeout(() => {
                    dropZone.classList.remove('dragover');
                }, 300);
                
                handleFile(file);
                status.textContent = 'Image pasted successfully!';
                return;
            }
        }
        
        // If we get here, no image was found in the clipboard
        status.textContent = 'No image found in clipboard. Try copying an image first.';
    }
});

// Make the dropzone appear as the paste target when needed
dropZone.addEventListener('click', (e) => {
    // Don't trigger file selection if clicking on buttons, links, or their container
    if (e.target === removeBtn || 
        e.target === resetBtn || 
        e.target === downloadBtn || 
        e.target === copyBtn ||
        e.target === viewMetadataBtn ||
        e.target.id === 'pasteImageBtn' ||  
        e.target.tagName === 'A' ||         
        e.target.id === 'directLink' ||     
        e.target.classList.contains('cta-container')) {
        return;
    }
    fileInput.click();
});

// Add focus hint text to dropzone
const updateDropzoneText = () => {
    const dropZoneHeader = dropZone.querySelector('h4');
    if (dropZoneHeader) {
        if (isMobileDevice()) {
            dropZoneHeader.innerHTML = 'Drag & drop an image here<br>or click to browse your photos';
        } else {
            dropZoneHeader.innerHTML = 'Drag & drop an image here, click to browse your photos,<br>or <strong>paste (Ctrl+V)</strong> an image';
        }
    }
};

// Call this during initialization
updateDropzoneText();

// Drag and drop handling
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});

// Handle file input change
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFile(fileInput.files[0]);
    }
});

// Handle file selection
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        status.textContent = 'Please select a valid image file (.png, .jpeg, .jpg, .heic, .webp)';
        return;
    }
    selectedFile = file;
    originalExtension = file.name.split('.').pop().toLowerCase();
    fileName.textContent = file.name;
    removeBtn.disabled = false;
    resetBtn.disabled = false;
    viewMetadataBtn.disabled = false;
    status.textContent = '';
    downloadButtons.classList.add('d-none');
}

// Function to read and display metadata
async function readMetadata(file) {
    return new Promise((resolve) => {
        const metadata = {};
        
        // Basic file info
        metadata['File Name'] = scrubbedBlob ? `camophoto_output.${originalExtension}` : file.name;
        metadata['File Size'] = `${(file.size / 1024).toFixed(2)} KB`;
        metadata['File Type'] = file.type;
        
        // Get EXIF data
        EXIF.getData(file, function() {
            // Get all available tags
            const exifData = EXIF.getAllTags(this);
            
            // If there's EXIF data, add categories
            if (exifData && Object.keys(exifData).length > 0) {
                // Image dimensions
                if (exifData.PixelXDimension && exifData.PixelYDimension) {
                    metadata['Image Dimensions'] = `${exifData.PixelXDimension} × ${exifData.PixelYDimension} pixels`;
                }
                
                // Camera info
                if (exifData.Make || exifData.Model || exifData.Software) {
                    if (exifData.Make) metadata['Camera Make'] = exifData.Make.trim();
                    if (exifData.Model) metadata['Camera Model'] = exifData.Model.trim();
                    if (exifData.Software) metadata['Software'] = exifData.Software.trim();
                }
                
                // Date and time information
                if (exifData.DateTime) metadata['Date Taken'] = exifData.DateTime;
                if (exifData.DateTimeOriginal) metadata['Original Date'] = exifData.DateTimeOriginal;
                if (exifData.DateTimeDigitized) metadata['Digitized Date'] = exifData.DateTimeDigitized;
                
                // Camera settings
                if (exifData.ExposureTime) metadata['Exposure Time'] = `${exifData.ExposureTime} sec`;
                if (exifData.FNumber) metadata['Aperture'] = `f/${exifData.FNumber}`;
                if (exifData.ISOSpeedRatings) metadata['ISO'] = exifData.ISOSpeedRatings;
                if (exifData.ExposureProgram) {
                    const programs = ['Not defined', 'Manual', 'Normal program', 'Aperture priority', 'Shutter priority', 
                                      'Creative program', 'Action program', 'Portrait mode', 'Landscape mode'];
                    metadata['Exposure Program'] = programs[exifData.ExposureProgram] || `Unknown (${exifData.ExposureProgram})`;
                }
                if (exifData.ExposureBiasValue) metadata['Exposure Bias'] = `${exifData.ExposureBiasValue} EV`;
                if (exifData.MeteringMode) {
                    const modes = ['Unknown', 'Average', 'Center-weighted average', 'Spot', 'Multi-spot', 
                                   'Pattern', 'Partial', 'Other'];
                    metadata['Metering Mode'] = modes[exifData.MeteringMode] || `Unknown (${exifData.MeteringMode})`;
                }
                if (exifData.Flash !== undefined) {
                    const didFlash = exifData.Flash & 0x1;
                    metadata['Flash'] = didFlash ? 'Fired' : 'Did not fire';
                }
                if (exifData.FocalLength) metadata['Focal Length'] = `${exifData.FocalLength} mm`;
                if (exifData.MaxApertureValue) metadata['Max Aperture'] = `f/${Math.sqrt(2) ** exifData.MaxApertureValue}`;
                if (exifData.FocalLengthIn35mmFilm) metadata['35mm Equivalent'] = `${exifData.FocalLengthIn35mmFilm} mm`;
                
                // GPS information
                if (exifData.GPSLatitude) {
                    try {
                        const lat = exifData.GPSLatitude;
                        const latRef = exifData.GPSLatitudeRef || 'N';
                        const latDegrees = lat[0] + lat[1]/60 + lat[2]/3600;
                        metadata['GPS Latitude'] = `${latDegrees.toFixed(6)}° ${latRef}`;
                        
                        if (exifData.GPSLongitude) {
                            const lon = exifData.GPSLongitude;
                            const lonRef = exifData.GPSLongitudeRef || 'E';
                            const lonDegrees = lon[0] + lon[1]/60 + lon[2]/3600;
                            metadata['GPS Longitude'] = `${lonDegrees.toFixed(6)}° ${lonRef}`;
                        }
                        
                        if (exifData.GPSAltitude) {
                            const alt = exifData.GPSAltitude;
                            const altRef = exifData.GPSAltitudeRef || 0;
                            metadata['GPS Altitude'] = `${altRef ? '-' : ''}${alt} meters`;
                        }
                    } catch (e) {
                        metadata['GPS Data'] = 'Present but could not be parsed';
                    }
                }
                
                // Copyright and author
                if (exifData.Copyright) metadata['Copyright'] = exifData.Copyright.trim();
                if (exifData.Artist) metadata['Artist'] = exifData.Artist.trim();
                if (exifData.XPAuthor) metadata['Author'] = exifData.XPAuthor.trim();
                
                // Additional information
                if (exifData.ImageDescription) metadata['Image Description'] = exifData.ImageDescription.trim();
                if (exifData.UserComment) metadata['User Comment'] = exifData.UserComment.trim();
                
                // Check for Windows-specific metadata
                if (exifData.XPTitle) metadata['Title'] = exifData.XPTitle.trim();
                if (exifData.XPComment) metadata['Comment'] = exifData.XPComment.trim();
                if (exifData.XPSubject) metadata['Subject'] = exifData.XPSubject.trim();
                if (exifData.XPKeywords) metadata['Keywords'] = exifData.XPKeywords.trim();
            } else {
                // For PNG, WebP, and other formats with limited EXIF support
                const img = new Image();
                img.onload = function() {
                    metadata['Image Dimensions'] = `${img.width} × ${img.height} pixels`;
                    
                    // For files that don't have EXIF data, end here
                    if (scrubbedBlob) {
                        metadata['Metadata Status'] = 'All metadata has been removed';
                    } else if (Object.keys(metadata).length <= 3) { // Only file info exists
                        metadata['Metadata Status'] = 'No EXIF metadata detected in this image format';
                    }
                    
                    resolve(metadata);
                };
                img.onerror = function() {
                    metadata['Error'] = 'Could not load image to get dimensions';
                    resolve(metadata);
                };
                img.src = URL.createObjectURL(file);
                return; // Exit early as we're handling the resolve in the callbacks
            }
            
            // Check if metadata was removed
            if (scrubbedBlob && Object.keys(exifData).length <= 1) {
                metadata['Metadata Status'] = 'All metadata has been removed';
            }
            
            resolve(metadata);
        });
    });
}

// Function to display metadata in popup
function displayMetadata(metadata) {
    metadataContent.innerHTML = '';
    
    // Group the metadata by category
    const groups = {
        'File Information': ['File Name', 'File Type', 'File Size', 'Image Dimensions', 'Metadata Status'],
        'Date and Time': ['Date Taken', 'Original Date', 'Digitized Date'],
        'Location Data': ['GPS Latitude', 'GPS Longitude', 'GPS Altitude'],
        'Author and Copyright': ['Artist', 'Author', 'Copyright'],
        'Description': ['Title', 'Subject', 'Keywords', 'Comment', 'Image Description', 'User Comment'],
        'Camera Information': ['Camera Make', 'Camera Model', 'Software'],
        'Camera Settings': ['Exposure Time', 'Aperture', 'ISO', 'Exposure Program', 'Exposure Bias', 
                           'Metering Mode', 'Flash', 'Focal Length', 'Max Aperture', '35mm Equivalent']
    };
    
    // Function to create a section if it has data
    function createSection(title, keys) {
        const hasData = keys.some(key => metadata[key] !== undefined);
        if (!hasData) return;
        
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'metadata-section';
        
        const sectionTitle = document.createElement('h4');
        sectionTitle.textContent = title;
        sectionTitle.style.marginTop = '1.5rem';
        sectionTitle.style.marginBottom = '0.5rem';
        sectionTitle.style.borderBottom = '1px solid #ddd';
        sectionTitle.style.paddingBottom = '0.3rem';
        sectionDiv.appendChild(sectionTitle);
        
        keys.forEach(key => {
            if (metadata[key]) {
                const p = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = `${key}: `;
                p.appendChild(strong);
                p.appendChild(document.createTextNode(metadata[key]));
                sectionDiv.appendChild(p);
            }
        });
        
        metadataContent.appendChild(sectionDiv);
    }
    
    // Create sections for each group
    Object.keys(groups).forEach(group => {
        createSection(group, groups[group]);
    });
    
    // Show the popup
    metadataPopup.classList.add('active');
}

// View metadata button handler
viewMetadataBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // Prevent triggering drop zone click
    if (!selectedFile) return;

    status.textContent = 'Reading metadata...';
    try {
        const metadata = await readMetadata(selectedFile);
        displayMetadata(metadata);
        status.textContent = '';
    } catch (error) {
        status.textContent = 'Error reading metadata. The image may not contain EXIF data.';
    }
});

// Close metadata popup
closeMetadataBtn.addEventListener('click', () => {
    metadataPopup.classList.remove('active');
});

// Close popup when clicking outside
metadataPopup.addEventListener('click', (e) => {
    if (e.target === metadataPopup) {
        metadataPopup.classList.remove('active');
    }
});

// Strip metadata from image
async function stripMetadata(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Set canvas dimensions to match the image
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw the image onto the canvas (strips metadata)
            ctx.drawImage(img, 0, 0);
            
            // Convert canvas to Blob with same image type as original
            canvas.toBlob((blob) => {
                if (blob) {
                resolve(blob);
                } else {
                    reject(new Error('Failed to create image blob'));
                }
            }, file.type, 1.0); // Use original format and max quality
            
            URL.revokeObjectURL(img.src); // Clean up memory
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

// Remove metadata
removeBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // Prevent triggering drop zone click
    if (!selectedFile) return;

    status.textContent = 'Processing...';
    removeBtn.disabled = true;

    try {
        scrubbedBlob = await stripMetadata(selectedFile);
        status.textContent = 'Metadata removed!';
        downloadButtons.classList.remove('d-none');
        
        // Update the file for metadata viewing with new name
        const newFileName = `camophoto_output.${originalExtension}`;
        selectedFile = new File([scrubbedBlob], newFileName, { type: selectedFile.type });
        fileName.textContent = newFileName;
    } catch (error) {
        status.textContent = `Error: ${error.message} (HEIC may not be supported in your browser)`;
        removeBtn.disabled = false;
    }
});

// Download scrubbed file - improve for mobile
downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering drop zone click
    if (!scrubbedBlob) return;
    
    // Show processing message
    status.textContent = 'Processing...';
    
    // For mobile browsers - use a simpler, more reliable approach
    if (isMobileDevice()) {
        try {
            // We unify the approach for Safari, Brave iOS, etc.
            const blobUrl = URL.createObjectURL(scrubbedBlob);
            const newWindow = window.open(blobUrl, '_blank');
            
            if (!newWindow) {
                // If popup was blocked or opening fails, display the image directly
                status.innerHTML = 'Popup blocked. Output image displayed below, press and hold to save or copy:';
                
                const imgDisplay = document.createElement('img');
                imgDisplay.src = blobUrl;
                imgDisplay.style.maxWidth = '100%';
                imgDisplay.style.borderRadius = '8px';
                imgDisplay.style.marginTop = '1rem';
                imgDisplay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                
                // Insert after download button
                downloadBtn.parentNode.insertBefore(imgDisplay, downloadBtn.nextSibling);
                
            } else {
                status.innerHTML = 'Image opened in a new tab.<br>Press and hold on the image to save it.';
            }
            
            // Clean up after some time
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 60000);
        } catch (err) {
            console.error('Error in mobile download:', err);
            status.innerHTML = 'There was an error opening the image. Please try again.';
        }
    } else {
        // Normal download flow for desktop browsers
    const url = URL.createObjectURL(scrubbedBlob);
    const a = document.createElement('a');
    a.href = url;
        a.download = `camophoto_output.${originalExtension}`;
        document.body.appendChild(a);
    a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        status.textContent = 'Image downloaded!';
    }
});

// Copy scrubbed file to clipboard
copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); // Prevent triggering drop zone click
    if (!scrubbedBlob) return;
    
    // if on mobile, show a message that this isn't supported
    if (isMobileDevice()) {
        status.innerHTML = 'Copying to clipboard is not supported on mobile devices.<br>Please use the Download button instead.';
        return;
    }
    
    // Show processing message
    status.textContent = 'Preparing image for clipboard...';
    
    try {
        // Create an image element
        const img = new Image();
        
        // Set up load handler before setting src
        const imageLoaded = new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
        });
        
        // Load the image from our blob
        img.src = URL.createObjectURL(scrubbedBlob);
        await imageLoaded;
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Draw the image to the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Convert to data URL for clipboard
        const dataUrl = canvas.toDataURL('image/png');
        
        // Most reliable method - create a fetch request for the data URL
        // and convert it to a blob, which works better with clipboard
        const fetchResp = await fetch(dataUrl);
        const blob = await fetchResp.blob();
        
        // Now try to write to clipboard
        if (navigator.clipboard && navigator.clipboard.write) {
            // This is the modern way that should work in Chrome, Edge, etc. on HTTPS
            const clipboardItem = new ClipboardItem({
                [blob.type]: blob
            });
            
            await navigator.clipboard.write([clipboardItem]);
            status.textContent = 'Image copied to clipboard!';
        } else {
            throw new Error('Clipboard API not supported in this browser');
        }
    } catch (err) {
        console.error('Copy to clipboard error:', err);
        
        // Provide a clear, actionable message
        status.innerHTML = 'Copying images to clipboard is not supported in this browser.<br>' +
                           'Please use the Download button instead.';
        
        // Highlight the download button as an alternative
        downloadBtn.style.boxShadow = '0 0 10px var(--accent-color)';
        setTimeout(() => {
            downloadBtn.style.boxShadow = '';
        }, 3000);
    }
});

// Reset app state
resetBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering drop zone click
    selectedFile = null;
    scrubbedBlob = null;
    originalExtension = '';
    fileName.textContent = '';
    status.textContent = '';
    removeBtn.disabled = true;
    resetBtn.disabled = true;
    viewMetadataBtn.disabled = true;
    downloadButtons.classList.add('d-none');
    fileInput.value = ''; // Clear file input
    metadataPopup.classList.remove('active'); // Close metadata popup
});