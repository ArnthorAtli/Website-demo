var gl;
var program;
var cube;
var model2clip;
var model2world;
var world2clip;
var model = 0;
var lastValue = 20;
var spinning = false;

var ground;

var lightP, lightI, eyeP;
var flatOrRound = 0;

var texture1;


window.onload = function init()
{
    
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.1, 0.1, 0.1, 1.0 );

    var image1 = new Image();

    image1.crossOrigin = "anonymous";

    image1.onload = function() {
        console.log("image1 loading");
	texture1 = Texture2D.create(gl, Texture2D.Filtering.BILINEAR,
				    // Texture2D.Wrap.CLAMP_TO_EDGE, 
                                    Texture2D.Wrap.CLAMP_TO_EDGE, 
                                    image1.width, image1.height,
				    gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image1);
    };
    
    image1.src = "grass.jpg";
    
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // cube = new Cube(gl);
    sphere = new Sphere(gl,16,8)
    

    body = makeBody(gl,model);



    // Make the center of the model the origin of the object.
    // var modelT = new PV(-0.5, -0.5, -0.5, false);
    var modelT = new PV(false);
    var model2object = Mat.translation(modelT);
    var object2model = Mat.translation(modelT.minus());

    // Give the object a small initial rotation in x and y.
    var object2rotated = Mat.rotation(1, 0.1).times(Mat.rotation(0, 0.1));
    var rotated2object = Mat.rotation(0, -0.1).times(Mat.rotation(1, -0.1));

    // Current translation of the object in the world.
    var translation = new PV(0, 0, 0, false);

    var rotated2world = Mat.translation(translation);
    var world2rotated = Mat.translation(translation.minus());

    // Change z translation to 3.
    var translation2 = new PV(0, 0, -3, false);
    var world2view = Mat.translation(translation2);
    var view2world = Mat.translation(translation2.minus());

    // Clicking lookAt button sets world2view and view2world using
    // lookAt() function.
    document.getElementById("lookAt").onclick = function () {
        lookAt();
    };

    document.getElementById("ChangeModel").onclick = function () {
        body = null;
        model= (model+1)%3;
        body = makeBody(gl,model);

        body.joint2parent = rotated2world;
        body.parent2joint = world2rotated
        body.setParent2World(body.joint2parent, body.parent2joint);
       
        updateM2C();

    };
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    document.getElementById("Animate").onclick = async function () {
        //make the two robots wave their hand
        if(model<=1&&spinning==false){
            spinning =true;
            let t = new PV(0.8, 0.5, 0, false);
            body.children[1].part2joint = new Mat();
            body.children[1].joint2part = new Mat();
            //Hand up
            for(var w = 6.5;w<9.5;w+=0.1){
                body.children[1].joint2parent = Mat.translation(t).times(Mat.rotation(2,w*3.1415/4));
                body.children[1].parent2joint = Mat.rotation(2, -w*3.1415/4).times(Mat.translation(t.minus()));
                updateM2C();
                await sleep(10);
            }
            //wiggle hand at top
            for(let waves = 2; waves>0;waves--){
                    //Hand little down
                for(var w = 9.5;w>8.5;w-=0.1){
                    body.children[1].joint2parent = Mat.translation(t).times(Mat.rotation(2,w*3.1415/4));
                    body.children[1].parent2joint = Mat.rotation(2, -w*3.1415/4).times(Mat.translation(t.minus()));
                    updateM2C();
                    await sleep(10);
                }
                //Hand little up
                for(var w = 8.5;w<9.5;w+=0.1){
                    body.children[1].joint2parent = Mat.translation(t).times(Mat.rotation(2,w*3.1415/4));
                    body.children[1].parent2joint = Mat.rotation(2, -w*3.1415/4).times(Mat.translation(t.minus()));
                    updateM2C();
                    await sleep(10);
                }

            }  
            //Hand down
            for(var w = 9.5;w>6.5;w-=0.1){
                body.children[1].joint2parent = Mat.translation(t).times(Mat.rotation(2,w*3.1415/4));
                body.children[1].parent2joint = Mat.rotation(2, -w*3.1415/4).times(Mat.translation(t.minus()));
                updateM2C();
                await sleep(10);
            }
            spinning = false;
        }
        //makes the ball roll and stop roll when pressed again
        else{
            spinning = spinning?false:true;
            let w = 0
            while(model==2&&spinning){
                body.children[0].joint2parent = Mat.rotation(2,w);
                body.children[0].parent2joint = Mat.rotation(2, -w);
                updateM2C();
                await sleep(10);
                w+=0.1;
            }
        }
    }

    // Camera rotates to look at center of object, keeping its x-axis level.
    function lookAt () {

        // eye position is (0,0,0) in view coordinates....
        // object center position is (0,0,0) in object coordinates....
        // Calculate view2world and world2view.
        eye = view2world.times(new PV(true));
        obj = rotated2world.times(new PV(true));
        var wy = new PV(0, 1, 0, false);
        var vz = eye.minus(obj).unit();
        
        var vx = wy.cross(vz).unit();
        var vy = vz.cross(vx);

        var R = new Mat(vx, vy, vz);
        var Rinv = R.transpose();

        
        var T = Mat.translation(eye);
        var Tinv = Mat.translation(eye.minus());

        view2world = T.times(R);
        world2view = Rinv.times(Tinv);

        
        updateM2C();
    }
        
    // Simple orthographic projection.
    var view2proj = Mat.scale(new PV(1, 1, -1, false));
    var proj2view = view2proj;
 
    // Display portion of view between z=-near and z=-far.
    var near = 2.0, far = 10.0;

    function setOrthographic () {

        // Set view2proj and proj2view based on values of near and far
        // and the orthographic projection.
        // What value of z translates to 0?
        // How is z scaled so near to far goes to -1 to 1?
        view2proj = Mat.scale(new PV(1, 1, 2/(near - far), true))
            .times(Mat.translation(new PV(0, 0, (near + far)/2, false)));
        proj2view = Mat.translation(new PV(0, 0, -(near + far)/2, false))
            .times(Mat.scale(new PV(1, 1, (near - far)/2, true)));

      
        updateM2C();
    }
    

    function setPerspective () {

        // Set view2proj and proj2view based on values of near and far
        // and the perspective projection.
        // Clicking My Button will switch between ortho and perspective.
        var a = -(far + near) / (far - near);
        var b = -2 * far * near / (far - near);
        view2proj = new Mat();
        view2proj[2][2] = a;
        view2proj[2][3] = b;
        view2proj[3][2] = -1;
        view2proj[3][3] = 0;
        
        proj2view = new Mat();
        proj2view[2][2] = 0;
        proj2view[2][3] = -1;
        proj2view[3][2] = 1 / b;
        proj2view[3][3] = a / b;

      
        updateM2C();
    }

    var aspect = canvas.width / canvas.height;
    var proj2clip = Mat.scale(new PV(1 / aspect, 1, 1, true));
    var clip2proj = Mat.scale(new PV(aspect, 1, 1, true));

    // Zoom factor.
    var zoom = 1;

    function setZoom () {

        // Set proj2clip and clip2proj based on zoom (and aspect ratio).
        proj2clip = Mat.scale(new PV(zoom / aspect, zoom, 1, true));
        clip2proj = Mat.scale(new PV(aspect / zoom, 1 / zoom, 1, true));
        
        
        updateM2C();
    }

    var clip2canvas =
        Mat.scale(new PV(canvas.width / 2.0, -canvas.height / 2.0, 1, true))
        .times(Mat.translation(new PV(1, -1, 0, false)));
    var canvas2clip =
        Mat.translation(new PV(-1, 1, 0, false))
        .times(Mat.scale(new PV(2.0 / canvas.width, -2.0 / canvas.height, 1, true)));



    updateM2C();

    function updateM2C () {
        model2clip = proj2clip.times(view2proj).times(world2view).times(rotated2world).times(object2rotated).times(model2object);

        world2clip = proj2clip.times(view2proj).times(world2view);

        
        
        

        // White light.
        lightI = new PV(1, 1, 1, true);

        // The light position is (10, 0, 10) in the world.
        // lightP = object2model.times(rotated2object.times(world2rotated.times(new PV(-10, 0, 10, true))));
        lightP = new PV(-10, 0, 10, true);

        // eyeP is the eye position in the world frame.
        eyeP = view2world.times(new PV(true));

        model2world = rotated2world.times(object2rotated).times(model2object);

        body.setParent2World(new Mat(), new Mat());

        

    }

    document.getElementById("slider").oninput = function(event) {
        console.log("slider " + event.target.value);


        // Set zoom to go from 1 to 10 as slider goes through range.
        // Zoom slider should now work.
        zoom = event.target.value / 100;
        console.log("zoom " + zoom);

        console.log("zoom " + zoom);
        setZoom();
    };

    var perspective = true;
    document.getElementById("MyButton").onclick = function () {
        console.log("You clicked My Button!");
        perspective = !perspective;
        if (perspective)
            setPerspective();
        else
            setOrthographic();
    };

    
    // Add a button that switches the value of flatOrRound between 1
    // (flat) and 2 (round).
   


    document.getElementById("sliderRobot").oninput = function(event) {
        console.log("slider " + event.target.value);

        // Set zoom to go from 1 to 10 as slider goes through range.
        // Zoom slider should now work.
        var currentValue = event.target.value;
        var delta = currentValue - lastValue;
        console.log(currentValue, lastValue)

        lastValue = currentValue;

        var T = Mat.translation(new PV(0, 0, delta, false));
        var Tinv = Mat.translation(new PV(0, 0, -delta, false));
        rotated2world = T.times(rotated2world);
        world2rotated = world2rotated.times(Tinv);
        body.joint2parent = rotated2world;
        body.parent2joint = world2rotated;
        updateM2C();
    };
    document.getElementById("sliderView").oninput = function(event) {
        console.log("slider " + event.target.value);

        // Set zoom to go from 1 to 10 as slider goes through range.
        // Zoom slider should now work.
        var currentValue = event.target.value;
        var delta = currentValue - lastValue;
        console.log(currentValue, lastValue)

        lastValue = currentValue;

        var T = Mat.translation(new PV(0, 0, delta, false));
        var Tinv = Mat.translation(new PV(0, 0, -delta, false));
        world2view = Tinv.times(world2view);
        view2world = view2world.times(T);
        updateM2C();
    };

    

    var clientX, clientY;
    var downWorld;
    var mouseIsDown = false;
    var vertexClickDistance = 10;
    var clickedModel;
    var closestHit;

    canvas.addEventListener("mousedown", function (e) {
        

        clientX = e.clientX;
        clientY = e.clientY;
        var cursorX = e.clientX - canvas.offsetLeft;
        var cursorY = e.clientY - canvas.offsetTop;
        
        var clipX = cursorX * 2 / canvas.width - 1;
        var clipY = -(cursorY * 2 / canvas.height - 1);
        


        // Calculate mouseCanvas.  Set clickedModel undefined.
        var mouseCanvas = new PV(cursorX, cursorY, 0, true);
        clickedModel = undefined;


        var fCanvas = new PV(cursorX, cursorY, -1, true);
        var bCanvas = new PV(cursorX, cursorY, 1, true);
        
        // Transform them to f and b in the world frame.
        var f = view2world.times(proj2view.times(clip2proj.times(canvas2clip.times(fCanvas)))).homogeneous();
        var b = view2world.times(proj2view.times(clip2proj.times(canvas2clip.times(bCanvas)))).homogeneous();

        // EXERCISE 8A:
        // Check that closestHit is null if you are clicking off the robot.
        closestHit = body.closestHit(f, b);
        console.log("closestHit " + closestHit);



        // For each vertex in the model, check if its image in the
        // canvas is less thant vertexClickDistance.
        // If so, set clickedModel.
        for (var i = 0; i < sphere.verts.length; i++) {
            var vertModel = sphere.verts[i];
            var vertCanvas = clip2canvas.times(proj2clip.times(view2proj.times(world2view.times(rotated2world.times(object2rotated.times(model2object.times(vertModel))))))).homogeneous();
            vertCanvas[2] = 0;
            if (mouseCanvas.distance(vertCanvas) < vertexClickDistance)
                clickedModel = vertModel;
        }

        

        // If clickedModel is defined, print it to the console.
        if (clickedModel != undefined)
            console.log("You clicked on " + clickedModel);


        // Transform center of object to canvas coordinates and
        // homogenenize (use .homogeneous()).
        var objCanvas = clip2canvas.times(proj2clip.times(view2proj.times(world2view.times(rotated2world.times(new PV(true)))))).homogeneous();

        // CHANGE the following mouse click to use the z-coordinate of
        // center of object instead of zero.
        mouseCanvas = new PV(cursorX, cursorY, objCanvas[2], true);

        // Homogenize the following:
        var mouseWorld = view2world.times(proj2view.times(clip2proj.times(canvas2clip.times(mouseCanvas)))).homogeneous();

        downWorld = mouseWorld;
        mouseIsDown = true;
    });

    canvas.addEventListener("mouseup", function (e) {
        mouseIsDown = false;
        if (e.clientX == clientX && e.clientY == clientY) {
            var cursorX = e.clientX - canvas.offsetLeft;
            var cursorY = e.clientY - canvas.offsetTop;
            
            var clipX = cursorX * 2 / canvas.width - 1;
            var clipY = -(cursorY * 2 / canvas.height - 1);
            
        }
    });

    canvas.addEventListener("mousemove", function (e) {
        if (!mouseIsDown)
            return;

        
        console.log("closestHit " + closestHit);

        var cursorX = e.clientX - canvas.offsetLeft;
        var cursorY = e.clientY - canvas.offsetTop;
        
        var clipX = cursorX * 2 / canvas.width - 1;
        var clipY = -(cursorY * 2 / canvas.height - 1);
        
            
        if (closestHit == null) {

            // Same as in mousedown.
            var objCanvas = clip2canvas.times(proj2clip.times(view2proj.times(world2view.times(rotated2world.times(new PV(true)))))).homogeneous();
            
            var mouseCanvas = new PV(cursorX, cursorY, objCanvas[2], true);
            var mouseWorld = view2world.times(proj2view.times(clip2proj.times(canvas2clip.times(mouseCanvas)))).homogeneous();
            
            var t = mouseWorld.minus(downWorld);
            rotated2world = Mat.translation(t).times(rotated2world);
            world2rotated = world2rotated.times(Mat.translation(t.minus()));
        

            // EXERCISE 8B
            // This should make off-robot dragging work.
            body.joint2parent = rotated2world;
            body.parent2joint = world2rotated
            body.setParent2World(body.joint2parent, body.parent2joint);




            downWorld = mouseWorld;
        }
        else {
            // Get the frontmost and backmost point corresponding to
            // the click point in the canvas.
            var fCanvas = new PV(cursorX, cursorY, -1, true);
            var bCanvas = new PV(cursorX, cursorY, 1, true);

            // Transform them to f and b in the world frame.
            var f = view2world.times(proj2view.times(clip2proj.times(canvas2clip.times(fCanvas)))).homogeneous();
            var b = view2world.times(proj2view.times(clip2proj.times(canvas2clip.times(bCanvas)))).homogeneous();

            // EXERCISE 10
            // This should make on-robot dragging work.
            // Call closestHit.drag
            // HERE
            closestHit.drag(f,b);


            if (false) {
            // u is the unit vector parallel to line fb
            var u = b.minus(f).unit();

            // o is the center of the object
            var o = new PV(true);

            // p is the vertex that was clicked on
            var p = object2rotated.times(model2object.times(clickedModel));

            // v is the vector from o to p
            var v = p.minus(o);

            // Calculate w, the vector that takes o to the closest
            // point on line fb and print it to the console.

            // w = of + u s
            // u dot w = 0
            // u dot (of + u s) = 0
            // u dot of + s = 0
            // s = - u dot of
            // w = of - u (u dot of)
            var of = f.minus(o);
            var w = of.minus(u.times(u.dot(of)));
            


            // Update w if it is longer than v.

            // If it is shorter, calculate t: the distance along fb to
            // a point whose distance from o is the length of v.
            // Set w to w + u t or w - ut, whichever is closer to v.

            // Print w to the console.

            if (w.magnitude() >= v.magnitude())
                w = w.unit().times(v.magnitude());
            else {
                // (w + u t)^2 = v^2
                // w^2 + t^2 = v^2
                // t^2 = v^2 - w^2
                // t = sqrt(v^2 - w^2)
                var t2 = v.dot(v) - w.dot(w);
                if (t2 < 0)
                    alert("t2 is " + t2);
                var t = Math.sqrt(t2);
                
                var wp = w.plus(u.times(t));
                var wm = w.minus(u.times(t));
                if (wp.distance(v) < wm.distance(v))
                    w = wp;
                else
                    w = wm;
                console.log("v " + v + "\nw " + w);
            }


            // No matter how we got w, check if its distance to v is
            // less than 1e-6.  If so, just return.
            if (w.distance(v) < 1e-6)
                return;

            // Calculate a rotation that takes v to w.
            var vx = v.unit();
            var vz = v.cross(w).unit();
            var vy = vz.cross(vx);
            var wx = w.unit();
            var wz = vz;
            var wy = wz.cross(wx);
            var vMat = new Mat(vx, vy, vz);
            var wMat = new Mat(wx, wy, wz);
            var vwMat = wMat.times(vMat.transpose());

            // How does object2rotated update?
            object2rotated = vwMat.times(object2rotated);
            rotated2object = rotated2object.times(vwMat.transpose());
            }
        }

        updateM2C();
    });

    window.onkeydown = function( event ) {
        switch (event.keyCode) {
        case 37:
            
            break;
        case 38:
            
            break;
        case 39:
            
            break;
        case 40:
            
            break;
        }
        

        // Update world2view and view2world so that arrow keys move
        // the camera in the direction of the arrow by 0.1 units.
        if (37 <= event.keyCode && event.keyCode <= 40) {
            var t = [ [ -0.1, 0 ], [ 0, 0.1 ], [ 0.1, 0 ], [ 0, -0.1 ] ];
            var i = event.keyCode - 37;
            var t = new PV(t[i][0], t[i][1], 0, false);
            world2view = Mat.translation(t.minus()).times(world2view);
            view2world = view2world.times(Mat.translation(t));
            updateM2C();
            return;
        }
        
        var key = String.fromCharCode(event.keyCode);
        var rotSign = event.shiftKey ? -1 : 1;
        
        switch( key ) {
        case 'X':
            object2rotated = Mat.rotation(0, 0.1 * rotSign).times(object2rotated);
            rotated2object = rotated2object.times(Mat.rotation(0, -0.1 * rotSign));
            break;
            
        case 'Y':
            object2rotated = Mat.rotation(1, 0.1 * rotSign).times(object2rotated);
            rotated2object = rotated2object.times(Mat.rotation(1, -0.1 * rotSign));
            break;
            
        case 'Z':
            object2rotated = Mat.rotation(2, 0.1 * rotSign).times(object2rotated);
            rotated2object = rotated2object.times(Mat.rotation(2, -0.1 * rotSign));
            break;

        case 'O':
            setPerspective();
            for(let i = 0; i<10;i++){
                var T = Mat.translation(new PV(0, 0, -0.1, false));
                var Tinv = Mat.translation(new PV(0, 0, 0.1, false));
                rotated2world = T.times(rotated2world);
                world2rotated = world2rotated.times(Tinv);
                body.joint2parent = rotated2world;
                body.parent2joint = world2rotated;
            }
            updateM2C();

            break;

        }
        
        updateM2C();
    };

    window.onresize = function (event) {
        
    }
    setPerspective();
    for(let i = 0; i<20;i++){
        var T = Mat.translation(new PV(0, 0, -0.1, false));
        var Tinv = Mat.translation(new PV(0, 0, 0.1, false));
        rotated2world = T.times(rotated2world);
        world2rotated = world2rotated.times(Tinv);
        body.joint2parent = rotated2world;
        body.parent2joint = world2rotated;
    }
    updateM2C();

    render();
};


function render() {
    gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!texture1) {
        requestAnimFrame( render )
        return;
    }

    
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(program, "tex1"), 0);
    texture1.bind(gl);

    ground = [];
    for(let w =-3; w<=3;w++){
        console.log(w);
        for(let i =-2; i<=2;i++){
            ground.push(new Picture(gl, new PV((w*4)-2, -3,i*4 , true), new PV(1, 0, 0, false), new PV(0, 0, -1, false), 4, 1));
        }
    }
    var picture2worldloc = gl.getUniformLocation( program, "model2world" );
    for(let w =0; w<7*5;w++){
        let picture = ground[w];
        gl.uniformMatrix4fv(picture2worldloc, false, picture.picture2world.flatten());
        picture.render(gl, program);
    }

    
    

    // Run shader program to render picture.
    //picture.render(gl, program);

    // var model2clipLoc = gl.getUniformLocation( program, "model2clip" );
    // gl.uniformMatrix4fv(model2clipLoc, false, model2clip.flatten());

    gl.uniformMatrix4fv(gl.getUniformLocation( program, "world2clip" ), 
                        false, world2clip.flatten());

    /*
    gl.uniformMatrix4fv(gl.getUniformLocation( program, "model2world" ), 
                        false, model2world.flatten());
    */

    gl.uniform4fv(gl.getUniformLocation(program, "lightP"), lightP.flatten());
    gl.uniform4fv(gl.getUniformLocation(program, "lightI"), lightI.flatten());
    gl.uniform4fv(gl.getUniformLocation(program, "eyeP"), eyeP.flatten());    

    //sphere.render(gl, program, flatOrRound);

    body.render(gl, program);

    requestAnimFrame( render )
}
