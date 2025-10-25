
var gl;
var vertices;
var vertices2;
var program;
var bufferId;
var bufferId2;
var translation = vec4(0,0,0,0);
var translation2 = vec4(0.3,0,0,0);




window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    
    // Four Vertices
    
    vertices = [
        vec2( -0.5, -0.5 ),
        vec2(  0.5, -0.5 ),
        vec2( -0.5,  0.5 ),
        vec2(  0.5,  0.5)
    ];

    // A 3D triangle
    vertices2 = [
        vec3( -0.75,-.75, 0.5 ),
        vec3(0.75, -0.75,0.5 ),
        vec3(0.0,0.25, -0.5 )
    ];
    colors2 = [
        vec3( 1,0,0),
        vec3(0,1,0),
        vec3(0,0,1)
    ];

    // Step 2

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    bufferId2 = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId2 );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices2), gl.STATIC_DRAW );

    bufferId2c = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId2c );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors2), gl.STATIC_DRAW );

    document.getElementById("MyButton").onclick = function () {
    
    };
    document.getElementById("z+1").onclick = function () {
        translation2[2]+=0.1;
    };
    document.getElementById("z-1").onclick = function () {
        translation2[2]-=0.1;
    };


    mouseIsDown = false;
    mouseMovedWhileDown = false;
    downX = 0;
    downY = 0;

    //onClick
    canvas.addEventListener("click", function (e) {
        if(mouseMovedWhileDown==false){
            var cursorX = e.clientX - canvas.offsetLeft;
            var cursorY = e.clientY - canvas.offsetTop;
            var clipX = cursorX * 2 / canvas.width - 1;
            var clipY = -(cursorY * 2 / canvas.height - 1);
            

            vertices.push(vec2(clipX, clipY));
            gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
            gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );
        }
        else{
            mouseMovedWhileDown = false;
        }
    });

    //OnMouseDown
    canvas.addEventListener("mousedown", function (e){
        var cursorX = e.clientX - canvas.offsetLeft;
        var cursorY = e.clientY - canvas.offsetTop;
        var clipX = cursorX * 2 / canvas.width - 1;
        var clipY = -(cursorY * 2 / canvas.height - 1);
        downX = clipX;
        downY = clipY;
        mouseIsDown = true;
        
    })
    //OnMouseUp
    canvas.addEventListener("mouseup", function(e){
        mouseIsDown = false;
    
    })
    //OnMouseMove
    canvas.addEventListener("mousemove", function(e){
        if(mouseIsDown){
        
            var cursorX = e.clientX - canvas.offsetLeft;
            var cursorY = e.clientY - canvas.offsetTop;
            var clipX = cursorX * 2 / canvas.width - 1;
            var clipY = -(cursorY * 2 / canvas.height - 1);
            translation2[0]+=clipX-downX;
            translation2[1]+=clipY-downY;
            downX = clipX;
            downY = clipY;
            mouseMovedWhileDown =true;}

    })


    render();
};


function render() {
    
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //House
    var colorLoc = gl.getUniformLocation( program, "uColor" );
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    var color = vec4(0.0, 1.0, 0.0, 1.0);
    var uColor = vec4(0.0, 1.0, 0.0, 1.0);
    gl.uniform4fv( colorLoc, flatten(uColor) );
    var translationloc = gl.getUniformLocation( program, "translation" );
    gl.uniform4fv(translationloc,flatten(translation));

    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.disabeVertexAttribArray( vPosition );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, vertices.length );

    //Triangle
    var vColor = gl.getAttribLocation( program, "vColor" );
    var color2 = vec4(1.0, 0, 0.0, 1.0);
    var uColor = vec4(0, 0, 1, 1.0);
    gl.uniform4fv( colorLoc, flatten(uColor) );
    var translationloc = gl.getUniformLocation( program, "translation" );
    gl.uniform4fv(translationloc,flatten(translation2));

    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId2 );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId2c );
    gl.vertexAttribPointer( vColor, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, vertices2.length );
    
    requestAnimFrame( render );
}
