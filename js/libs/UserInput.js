window.userInput = {
    mouseDown: false,
    touchDown: false,
    rightClick: false,
    
    camera: {
        X0: 0,
        Y0: 0,
        R0: 0
    },
    
    mouse: {
        X: 0,
        Y: 0,
        X0: 0,
        Y0: 0
    },
    
    touch: {
        distance: 1,
        rotation: 0,
        distance0: 1,
        rotation0: 0
    },
    
    updateCamera: function() {
        this.camera.X0 = getInput("x");
        this.camera.Y0 = getInput("y");
        this.camera.R0 = getInput("rot");
    },

    updateMouseX: function(x) {
        this.mouse.X = x;
    },
    
    updateMouseY: function(y) {
        this.mouse.Y = y;
    },

    updateMouseX0: function(x0) {
        this.mouse.X0 = x0;
    },
    
    updateMouseY0: function(y0) {
        this.mouse.Y0 = y0;
    },

    updateTouchRotation: function(rotation) {
        this.touch.rotation = rotation;
    },
    
    updateTouchDistance: function(distance) {
        this.touch.distance = distance;
    },

    updateTouchRotation0: function(rotation0) {
        this.touch.rotation0 = rotation0;
    },
    
    updateTouchDistance0: function(distance0) {
        this.touch.distance0 = distance0;
    }
};


function touchstartHandler(event) {
    // Disable handler when user input is turned off.
    if (!userInputOn) {
        return;
    }
    
    var c_width = document.getElementsByTagName("canvas")[0].width;
    var c_height = document.getElementsByTagName("canvas")[0].height;
    
    // Single touch event: panning
    if (event.targetTouches.length == 1) {
        var x = event.targetTouches[0].clientX;
        var y = c_height - event.targetTouches[0].clientY;
        
        // // Exit handler when touch occurs within the toolbar.
        // if (toolbar.rect.left < x 
        //     && x < toolbar.rect.right
        //     && toolbar.rect.top < c_height - y
        //     && c_height - y < toolbar.rect.bottom) {
        //     return;
        // }
        
        userInput.updateMouseX(x);
        userInput.updateMouseY(y);
        userInput.updateMouseX0(x);
        userInput.updateMouseY0(y);
        userInput.updateCamera();

        // Turn on click events & update right click setting.
        userInput.touchDown = true;
    }

    // 2+ touch events: zooming & rotating
    if (event.targetTouches.length >= 2) {
        // Temporarily disallow mouse updates until the proper references are set.
        userInput.touchDown = false;

        var x1 = event.targetTouches[0].clientX;
        var x2 = event.targetTouches[1].clientX;
        var y1 = c_height - event.targetTouches[0].clientY;
        var y2 = c_height - event.targetTouches[1].clientY;

        // Generate a reference for panning moves.
        userInput.updateMouseX((x1 + x2) / 2);
        userInput.updateMouseX0(userInput.mouse.X);
        userInput.updateMouseY((y1 + y2) / 2);
        userInput.updateMouseY0(userInput.mouse.Y);
        userInput.updateCamera();
        
        // Allow panning.
        userInput.touchDown = true;

        // Create zoom reference.
        userInput.updateTouchDistance0(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));
        userInput.updateTouchDistance(userInput.touch.distance0);
        
        // Create rotation reference.
        userInput.updateTouchRotation0(Math.atan2(y2 - y1, x2 - x1));
        userInput.updateTouchRotation(userInput.touch.rotation0);
    }
}


function touchmoveHandler(event) {
    // Disable handler when user input is turned off.
    if (!userInputOn) {
        return;
    }
    
    var c_width = document.getElementsByTagName("canvas")[0].width;
    var c_height = document.getElementsByTagName("canvas")[0].height;
    
    var x = event.targetTouches[0].clientX;
    var y = c_height - event.targetTouches[0].clientY;
    
    // // Prevent default behavior (scrolling, &c.) unless inside the toolbar.
    // if (!(toolbar.rect.left < x 
    //         && x < toolbar.rect.right
    //         && toolbar.rect.top < c_height - y
    //         && c_height - y < toolbar.rect.bottom)) {
    //     event.preventDefault();
    // }
    
    // Single touch input: just update the "mouse" position.
    if (event.targetTouches.length == 1) {
        userInput.updateMouseX(x);
        userInput.updateMouseY(y);
    }

    // 2+ touch input: update the average panning distance, the zoom, & the rotation.
    if (event.targetTouches.length >= 2) {
        var x1 = event.targetTouches[0].clientX;
        var x2 = event.targetTouches[1].clientX;
        var y1 = c_height - event.targetTouches[0].clientY;
        var y2 = c_height - event.targetTouches[1].clientY;

        // Update the average panning distance.
        userInput.updateMouseX((x1 + x2) / 2);
        userInput.updateMouseY((y1 + y2) / 2);

        // Update zoom distance.
        userInput.updateTouchDistance(
            Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
        );
        
        // Update the input object with the new zoom distance.
        var touchZoom = -1 + userInput.touch.distance / userInput.touch.distance0;
        setInput(["scale", getInput("scale") + touchZoom / 2]);
        
        // Reset the zoom reference, to keep the camera from continually zooming.
        userInput.updateTouchDistance0(userInput.touch.distance);

        // Update the rotation distance.
        userInput.updateTouchRotation(Math.atan2(y2 - y1, x2 - x1));
    }
}

function touchendHandler(event) {
    if (event.targetTouches.length == 0) {
        // Disable all input events.
        userInput.touchDown = false;
        userInput.rightClick = false;
    }
    
    if (event.targetTouches.length == 1) {
        // Temporarily disallow touch events while updating the reference.
        userInput.touchDown = false;
        
        var x = event.targetTouches[0].clientX;
        var y = c_height - event.targetTouches[0].clientY;
        
        // Reset the reference for panning.
        userInput.updateMouseX0(x);
        userInput.updateMouseX(x);
        userInput.updateMouseY0(y);
        userInput.updateMouseY(y);
        userInput.updateCamera();

        // Turn on user input events.
        userInput.touchDown = true;
    }

    if (event.targetTouches.length >= 2) {
        // If 2+ touches are still registered, this shouldn't do anything.
        return;
    }
}


function keyboardHandler(event) {
    if (!userInputOn) {
        return;
    }
    
    var charCode = event.keyCode || event.which;
    var charStr = String.fromCharCode(charCode);

    switch(charStr) {
        case "A":
            setInput(["rot", getInput("rot") - inputSettings.rotStep]);
            break;
        case "D":
            setInput(["rot", getInput("rot") + inputSettings.rotStep]);
            break;
        case "W":
            setInput(["scale", getInput("scale") + inputSettings.zStep]);
            break;
        case "S":
            setInput(["scale", getInput("scale") - inputSettings.zStep]);
            break;
        case "J":
            setInput(["x", getInput("x") + inputSettings.xyStep]);
            break;
        case "L":
            setInput(["x", getInput("x") - inputSettings.xyStep]);
            break;
        case "I":
            setInput(["y", getInput("y") - inputSettings.xyStep]);
            break;
        case "K":
            setInput(["y", getInput("y") + inputSettings.xyStep]);
            break;
        case "V":
            saveStateToDropdown('State');
            break;
        case "R":
        
            var fresh = new VF.Spacemap();
            
            fresh.scale.set(1.3, 1.3, 1);
            
            app.portal.spacemap.set([fresh]);

            break;
        case "T":
            // toggle visibility of stats.
            if (stats.dom.style.display == "") {
                stats.dom.style.display = "none";
            } else {
                stats.dom.style.display = "";
            }
            break;
        case " ":
            // Stop/resume toggle.
            if (vfr.state !== VFRenderer.states.play) {
                vfr.stop();
                vfr.play();
            } else {
                vfr.stop();
            }
            break;
        case "N":
            // Single frame step.
            vfr.play();
            vfr.framesToRender = 1;
            break;
            
    }
}

function mousedownHandler(event) {
    // Disable handler when user input is turned off.
    if (!userInputOn) {
        return;
    }
    
    var c_width = document.getElementsByTagName("canvas")[0].width;
    var c_height = document.getElementsByTagName("canvas")[0].height;
    
    // Get mouse coordinates relative to the SW corner.
    var x = event.clientX;
    var y = c_height - event.clientY;
    
    // // Exit handler if mouse is within the toolbar.
    // if (toolbar.rect.left < x 
    //     && x < toolbar.rect.right
    //     && toolbar.rect.top < c_height - y
    //     && c_height - y < toolbar.rect.bottom) {
    //     return;
    // }
    
    // Update userInput object.
    userInput.updateMouseX(x);
    userInput.updateMouseY(y);
    userInput.updateMouseX0(x);
    userInput.updateMouseY0(y);
    userInput.updateCamera();
    
    // Turn on other click events.
    userInput.mouseDown = true;

    // Update right click setting.
    if (event.button == 2) {
        userInput.rightClick = true;
    }
}


function mousemoveHandler(event) {
    // If the mousedown event was never triggered, just return.
    if (!userInput.mouseDown) {
        return;
    }
    
    var c_width = document.getElementsByTagName("canvas")[0].width;
    var c_height = document.getElementsByTagName("canvas")[0].height;
    
    // Get mouse coordinates relative to the SW corner.
    var x = event.clientX;
    var y = c_height - event.clientY;
    
    // Update userInput object.
    userInput.updateMouseX(x);
    userInput.updateMouseY(y);
}


function mouseupHandler(event) {
    // Turn off mouse events.
    userInput.mouseDown = false;
    userInput.rightClick = false;
}


function scrollHandler(event) {
    // Disable handler when user input is turned off.
    if (!userInputOn) {
        return;
    }
    
    var c_width = document.getElementsByTagName("canvas")[0].width;
    var c_height = document.getElementsByTagName("canvas")[0].height;
    
    // // Get mouse coordinates relative to the SW corner.
    // var x = event.clientX;
    // var y = c_height - event.clientY;
    
    // // Exit handler if mouse is within the toolbar.
    // if (toolbar.rect.left < x 
    //     && x < toolbar.rect.right
    //     && toolbar.rect.top < c_height - y
    //     && c_height - y < toolbar.rect.bottom) {
    //     return;
    // }
    
    // Disable default action (scrolling).
    event.preventDefault();
    
    // Get scrolling distance.
    var d = ((typeof event.wheelDelta != "undefined") ? (-event.wheelDelta) : 
        event.detail);
    d = ((d > 0) ? -1 : 1);

    // Update input.
    setInput(["scale", getInput("scale") + d * inputSettings.zStep / 2]);
}


function updateUI() {
    
    var c_width = document.getElementsByTagName("canvas")[0].width;
    var c_height = document.getElementsByTagName("canvas")[0].height;
    
    // Touch inputs
    if (userInput.touchDown) {
        // Rotation
        setInput(["rot", getInput("rot") - (userInput.touch.rotation - userInput.touch.rotation0)]);
        userInput.updateTouchRotation0(userInput.touch.rotation);

        // Panning
        var dx = inputSettings.xyStep * (userInput.mouse.X - userInput.mouse.X0) * 40 / c_width
        / getInput("scale");
        var dy = inputSettings.xyStep * (userInput.mouse.Y - userInput.mouse.Y0) * 40 / c_height
        / getInput("scale");

        setInput(
            ["x", userInput.camera.X0 - dx],
            ["y", userInput.camera.Y0 - dy]
        );
    }
    
    // Mouse inputs
    else if (userInput.mouseDown) {
        // Rotation
        if (userInput.rightClick) {
            var angle = (userInput.mouse.X - userInput.mouse.X0) / c_width / getInput("scale");
            setInput(["rot", getInput("rot") + angle]);
            userInput.updateMouseX0(userInput.mouse.X);
        }

        // Panning
        else {
            var dx = inputSettings.xyStep * (userInput.mouse.X - userInput.mouse.X0) * 40 / c_width
            var dy = inputSettings.xyStep * (userInput.mouse.Y - userInput.mouse.Y0) * 40 / c_height

            setInput(
                ["x", userInput.camera.X0 - dx], 
                ["y", userInput.camera.Y0 - dy]
            );
        }
    }
    
    // Only run when the mouseDown or touchDown setting is on.
    else {
        return;
    }
}


function initializeEventListeners() {
    
    d = document.getElementById('simulation');
    
    // Keyboard handlers
    document.addEventListener("keydown", keyboardHandler, false);
    
    // Mouse handlers
    d.addEventListener("mousedown", mousedownHandler, false);
    d.addEventListener("mousemove", mousemoveHandler, false);
    d.addEventListener("mouseup", mouseupHandler, false);
    d.addEventListener("mouseout", mouseupHandler, false);
    
    // Scroll-wheel handlers
    d.addEventListener('mousewheel', scrollHandler, false);
    d.addEventListener('DOMMouseScroll', scrollHandler, false); // firefox
    
    // Touch handlers
    d.addEventListener("touchstart", touchstartHandler, false);
    d.addEventListener("touchmove", touchmoveHandler, false);
    d.addEventListener("touchend", touchendHandler, false);
    d.addEventListener("touchcancel", touchendHandler, false);
    d.addEventListener("touchleave", touchendHandler, false);

    // Disable context menu
    d.addEventListener("contextmenu", function(e) { e.preventDefault() }, false);
}