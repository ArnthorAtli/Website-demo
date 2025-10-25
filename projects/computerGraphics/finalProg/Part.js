
class Part {
    constructor (sphere, flatOrRound,
                 sphere2part, part2sphere, 
                 joint2parent, parent2joint) {
        // sphere defines the underlying part before distortion.
        this.sphere = sphere;
        
        // flatOrRound = 1:  flat shading.  = 2 : round shading.
        this.flatOrRound = flatOrRound;
        
        // sphere2part is the distortion of the sphere to make the part we want.
        this.sphere2part = sphere2part;
        this.part2sphere = part2sphere;
        
        // part2joint is the joint transformation.  Initially it is the
        // identity, meaning the joint is relaxed.  Changing part2joint
        // nods the head or bends the elbow.
        this.part2joint = new Mat();
        this.joint2part = new Mat();
        
        // joint2parent is the position of the joint with respect to the
        // parent when the joint is relaxed.  For example, the head is on
        // top of the body, not at its origin (center).
        this.joint2parent = joint2parent;
        this.parent2joint = parent2joint;
        
        // parent2world is the placement of the parent PART in the world.
        // (Not the parent sphere.)
        this.parent2world = new Mat();
        this.world2parent = new Mat();
        
        // sphere2world is the placement of the sphere in the world.  It
        // gets bound to model2world in the shading program.
        this.sphere2world = new Mat();
        this.world2sphere = new Mat();
        
        // sMin is the smallest positive s for a ray q + s u hitting a face
        // of the sphere.  It is Double.POSITIVE_INFINITY if no face is hit.
        this.sMin = Infinity;
        
        // pMin is the point on the sphere at which the ray hits closest.
        this.pMin = new PV(true);
        
        // children contains the child parts that are attached to this part.
        this.children = [];
    }
        
    setParent2World (parent2world, world2parent) {
        this.parent2world = parent2world;
        this.world2parent = world2parent;
        
        // EXERCISE 1:
        // Set sphere2world and world2sphere.
        // HERE

        this.sphere2world =  this.parent2world.times(this.joint2parent).times(this.part2joint).times(this.sphere2part);
        this.world2sphere =  this.part2sphere.times(this.joint2part.times(this.parent2joint.times(this.world2parent)));



        
        // Call setParent2world for each child.  Be careful!  You don't
        // just pass along parent2world and world2parent.
        // HERE
        var part2world = this.parent2world.times(this.joint2parent).times(this.part2joint);
        var world2part = this.joint2part.times(this.parent2joint.times(this.world2parent));


        
        for (var i = 0; i < this.children.length; i++)
            this.children[i].setParent2World(part2world, world2part);
    }

    // EXERCISE 2:
    render (gl, program) {
        // Setting model2world in shader.  (The sphere is the model.)
        gl.uniformMatrix4fv(gl.getUniformLocation( program, "model2world" ), 
                            false, this.sphere2world.flatten());
        
        // Set world2modelT (T means transpose) in shader.
	// Fix robot.html so it uses world2modelT where it should.
        // HERE
        var world2sphereT = this.world2sphere.transpose();
        gl.uniformMatrix4fv(gl.getUniformLocation( program, "world2modelT" ), false, world2sphereT.flatten());
        
        // Render this part's sphere.
        this.sphere.render(gl, program, this.flatOrRound);
        
        // Recursively call render for each child.
        // HERE

        for (var i = 0; i < this.children.length; i++)
            this.children[i].render(gl, program, this.flatOrRound);

        
        // TEST IT
    }
    
    // EXERCISE 7:
    // Determine part that is hit closest to front on the line segment
    // from front to back in world coordinates.  Set sMin and pMin for
    // that part.  Update closest (properly) in the loop.
    closestHit (front, back) {
        // Calculate q and u in sphere coordinates and use sphere.closestHit.
        // HERE
        var q = this.world2sphere.times(front);
        var u = this.world2sphere.times(back.minus(front).unit());
        this.sMin = sphere.closestHit(q,u);
        this.pMin = q.plus(u.times(this.sMin));

      
        console.log("this.sMin " + this.sMin);
        
        var closest = null;
        if (this.sMin != Infinity)
            closest = this;
        console.log(closest);
        // Recurse for each child.  Take the closest hit of all.
        for (var i = 0; i < this.children.length; i++) {
            var hit = this.children[i].closestHit(front, back);
            
            
            // Update closest.  Remember, if both hit and closest are
            // not null, you need to compare hit.sMin and closest.sMin.
            // HERE
           
            if (hit!=null){
                if((closest!=null&&hit.sMin<closest.sMin)||(closest==null)){
                    closest = hit;
                }
            }  
        }
        
        return closest;
    }
    
    // Drag part based on mouse position that corresponds to the line
    // segment from front to back in world coordinates.
    drag (front, back) {
        var o = new PV(true); // the origin in joint coordinates

        // EXERCISE 9A:
        // p is pMin in joint coordinates.
        // v is the vector from the origin to p.
        // f and b are front and back in joint coordinates.
        // Calculate of, fb, w, and the rotation of v into w.
        // Apply it to part2joint (which takes the place of model2rotated).
        var p = this.part2joint.times(this.sphere2part).times(this.pMin);
        var v = p.minus(o);
        var f = this.parent2joint.times(this.world2parent).times(front);
        var b = this.parent2joint.times(this.world2parent).times(back);


        var of = f.minus(o);
        var fb = b.minus(f).unit();

        // (of + fb s) * fb = 0
        // of * fb + s = 0
        // s = - of * fb
        var s = -of.dot(fb);
        // w is the vector from the center to that closest point.
        var w = of.plus(fb.times(s));
        
        var r = v.magnitude();
        var l = w.magnitude();
        // If w is shorter than v,
        if (l <= r) {
            // Calculate how far we need to move along the line to be the
            // same distance from the center as v.
            var z = Math.sqrt(r*r - l*l);
            
            // Move along the line that amount, in the same direction as v.
            if (v.dot(fb) > 0)
                w = w.plus(fb.times(z));
            else
                w = w.minus(fb.times(z));
        }
        else {
            // Otherwise scale w down to the magnitude of v.
            w.times(r/l);
        }
        
        // v is the x of a coordinate system.
        var vx = v;
        vx = vx.times(1/vx.magnitude());
        
        // w is the x of another coordinate system
        var wx = w;
        wx = wx.times(1/wx.magnitude());
        
        // Both systems should use v x w as their z direction.
        // So they are rotation about this z axis.
        var vz = vx.cross(wx);
        // Too short -- danger of divide by zero.
        if (vz.magnitude() < 1e-3)
            return;
        vz = vz.times(1/vz.magnitude());
        var wz = vz;
        
        // If you have x and z, you can get y.
        var vy = vz.cross(vx);
        var wy = wz.cross(wx);
        // Transforms [1 0 0 0]^T to vx
        var vMat = new Mat(vx, vy, vz);
        // Transforms [1 0 0 0]^T to wx
        var wMat = new Mat(wx, wy, wz);
        // Tranforms vx to [1 0 0 0]^T to wx.
        var vwMat = wMat.times(vMat.transpose());
        
        
        //EXERCISE 9B
        // Update orientation using vwMat.
        this.part2joint = vwMat.times(this.part2joint);
        this.joint2part = this.part2joint.transpose();
        console.log("jeeeeeeeee"+this.part2joint.times(this.joint2part));


    }
}

function makeHead_1 (gl, joint2parent, parent2joint) {
    var sphere = new Sphere(gl, 16, 8);
    var t = new PV(0, 1, 0, false);
    var sphere2part = Mat.scale(0.5).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.scale(2));
    var head= new Part(sphere, 2,
                    sphere2part, part2sphere,
                    joint2parent, parent2joint);
    //RIGHT ANTENNAE

    var t = new PV(0.15, 1, 0, false);
    var child2body = Mat.translation(t)
    var body2child = Mat.translation(t.minus());
    head.children.push(makeAnnete(gl,child2body, body2child));
    
    //LEFT ANTENNAE
    
    var t = new PV(-0.15, 1, 0, false);
    var child2body = Mat.translation(t);
    var body2child = Mat.translation(t.minus());
    head.children.push(makeAnnete(gl,child2body, body2child));

    return head;
    
}
function makeHead_0 (gl, joint2parent, parent2joint) {
    var sphere = new Sphere(gl, 24, 12);
    var t = new PV(0, 1, 0, false);
    var sphere2part = Mat.scale(new PV(0.8,1.2,0.8)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.scale(new PV(1.0/0.8,1.0/1.2,1.0/0.8)));
    var head= new Part(sphere, 2,
                    sphere2part, part2sphere,
                    joint2parent, parent2joint);
    //RIGHT Eye

    var t = new PV(0.2, 1.5, 0.75, false);
    var child2body = Mat.translation(t);
    var body2child = Mat.translation(t.minus());
    head.children.push(makeBall(gl,child2body, body2child,0.1));
    
    //LEFT Eye
    var t = new PV(-0.2, 1.5, 0.75, false);
    var child2body = Mat.translation(t);
    var body2child = Mat.translation(t.minus());
    head.children.push(makeBall(gl,child2body, body2child,0.1));

    //annete
    var t = new PV(0, 2.4, 0, false);
    var child2body = Mat.translation(t);
    var body2child = Mat.translation(t.minus());
    head.children.push(makeAnnete(gl,child2body, body2child));
    
    

    return head;
    
}
function makeBall (gl, joint2parent, parent2joint,scale) {
    var sphere = new Sphere(gl, 16, 8);
    var t = new PV(0, 0, 0, false);
    var sphere2part = Mat.scale(new PV(scale, scale, scale, false)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.scale(new PV(1.0/scale, 1.0/scale, 1.0/scale, false)));
    var ball = new Part(sphere, 2,
                            sphere2part, part2sphere,
                            joint2parent, parent2joint);
    
    return ball;
}


function makeUpperArm (gl, joint2parent, parent2joint) {
    var sphere = new Sphere(gl, 16, 2);
    var t = new PV(0.707, 0, 0, false);
    var sphere2part = Mat.scale(new PV(1.00, 0.2, 0.2, false)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.scale(new PV(1.0/1.0, 5.0, 5.0, false)));
    var upperArm = new Part(sphere, 2,
                            sphere2part, part2sphere,
                            joint2parent, parent2joint);
    {
        var t = new PV(1.414, 0, 0, false);
        var child2parent = Mat.translation(t);
        var parent2child = Mat.translation(t.minus());
        upperArm.children.push(makeLowerArm(gl, child2parent, parent2child));
    }
    return upperArm;
}

function makeAnnete (gl, joint2parent, parent2joint) {
    var sphere = new Sphere(gl, 16, 2);
    var t = new PV(0.4, 0, 0, false);
    var sphere2part = Mat.scale(new PV(0.05, 0.2, 0.05, false)).times(Mat.rotation(2, 3.1415/2)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.rotation(2, -3.1415/2)).times(Mat.scale(new PV(0.05/1.00, 5.0, 50.0, false)));
    var annete = new Part(sphere, 2,
                            sphere2part, part2sphere,
                            joint2parent, parent2joint);
    
    {
        var t = new PV(0, 0.23, 0, false);
        var child2parent = Mat.translation(t);
        var parent2child = Mat.translation(t.minus());
        var signal = makeBall(gl, child2parent, parent2child,0.1);
        annete.children.push(signal);
    }
    return annete;
}

function makeShoulder (gl, joint2parent, parent2joint) {
    var shoulder = makeBall(gl, joint2parent, parent2joint,0.3);
    
    {
        var t = new PV(0.2414, 0, 0, false);
        var child2parent = Mat.translation(t);
        var parent2child = Mat.translation(t.minus());
        shoulder.children.push(makeUpperArm_0(gl, child2parent, parent2child));
    }
    return shoulder;
}
function makeUpperArm_0 (gl, joint2parent, parent2joint) {
    var sphere = new Sphere(gl, 16, 2);
    var t = new PV(0.707, 0, 0, false);
    var sphere2part = Mat.scale(new PV(0.5, 0.2, 0.2, false)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.scale(new PV(1.0/1.0, 5.0, 5.0, false)));
    var upperArm = new Part(sphere, 2,
                            sphere2part, part2sphere,
                            joint2parent, parent2joint);
    {
        
        var t = new PV(0.707, 0, 0, false);
        var child2parent = Mat.translation(t);
        var parent2child = Mat.translation(t.minus());
        var hand = makeBall(gl, child2parent, parent2child,0.22);
        upperArm.children.push(hand);
    }
    return upperArm;
}

function makeLowerArm (gl, joint2parent, parent2joint) {
    var sphere = new Sphere(gl, 16, 2);
    var t = new PV(0.707, 0, 0, false);
    var sphere2part = Mat.scale(new PV(1.00, 0.2, 0.2, false)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.scale(new PV(1/1.00, 5.0, 5.0, false)));
    return new Part(sphere, 2,
                    sphere2part, part2sphere,
                    joint2parent, parent2joint);
}

function makeUpperLeg(gl, joint2parent, parent2joint){
    t = new PV(-0.707, 0, 0, false);
    var sphere = new Sphere(gl, 8, 2);
    var sphere2part = Mat.scale(new PV(0.4, 0.25, 0.4, true))
        .times(Mat.rotation(2, Math.PI/2)).times(Mat.translation(t));
    var part2sphere = Mat.translation(t.minus()).times(Mat.rotation(2, -Math.PI/2)
        .times(Mat.scale(new PV(1.0/0.4, 1.0/0.25, 1.0/0.4, true))));
   
    var glute = new Part(sphere,1,sphere2part,part2sphere,joint2parent,parent2joint);
    {
        var t = new PV(0, 0, 0, false);
        var sphere = new Sphere(gl, 6, 2);
        var sphere2part = Mat.scale(new PV(0.4, 0.25, 0.4, true))
            .times(Mat.rotation(2, Math.PI/2)).times(Mat.translation(t));
        var part2sphere = Mat.translation(t.minus()).times(Mat.rotation(2, -Math.PI/2)
            .times(Mat.scale(new PV(1.0/0.4, 1.0/0.25, 1.0/0.4, true))));
        var feet = new Part(sphere,1,sphere2part,part2sphere,joint2parent,parent2joint);
        glute.children.push(feet);
    }
    return glute;
}

function makeBody (gl, robot) {
    // EXERCISE 3:
    // Test with simple = false (sphere body no appendages) and true
    // (body with arm, leg, and extra head)
    // Switch back and forth for tests.
    // Remove the extra head and add the other arm and leg.
    // Put some antennae on the head.
    var robot = robot;
    var body = null;
    if (robot == 0) {
        var sphere = new Sphere(gl, 6, 2);
        var sphere2part = Mat.scale(new PV(1, 1, 1, true))
            .times(Mat.rotation(2, Math.PI/2));
        var part2sphere = Mat.rotation(2, -Math.PI/2)
            .times(Mat.scale(new PV(1.0, 1.0, 1, true)));
        
        body = new Part(sphere, 1, sphere2part, part2sphere,
                        new Mat(), new Mat());
        
        //NECK
        {
            var t = new PV(0, 0.707, 0, false);
            var sphere = new Sphere(gl, 8, 2);
            var neck2body = Mat.translation(t);
            var body2neck = Mat.translation(t.minus());

            t = new PV(0.707, 0, 0, false);
            var sphere2part = Mat.scale(new PV(0.7, 0.4, 0.6, true))
                .times(Mat.rotation(2, Math.PI/2)).times(Mat.translation(t));
            var part2sphere = Mat.translation(t.minus()).times(Mat.rotation(2, -Math.PI/2)
                .times(Mat.scale(new PV(1.0/0.7, 1.0/0.4, 1.0/0.6, true))));
           
            var neck = new Part(sphere,1,sphere2part,part2sphere,neck2body,body2neck);
            body.children.push(neck);
        }
        //HEAD
        {
            var t = new PV(0, 0.45, 0, false);
            var head2body = Mat.translation(t);
            var body2head = Mat.translation(t.minus());
            neck.children.push(makeHead_0(gl, head2body, body2head));

        }
        //right Arm
        {
            var t = new PV(0.8, 0.5, 0, false);
            var shoulder2body = Mat.translation(t).times(Mat.rotation(2,-1.5*3.1415/4));
            var body2shoulder = Mat.rotation(2, 1.5*3.1415/4).times(Mat.translation(t.minus()));
            body.children.push(makeShoulder(gl,shoulder2body,body2shoulder));
        }
        //left Arm
        {
            var t = new PV(-0.8, 0.5, 0, false);
            var shoulder2body = Mat.translation(t).times(Mat.rotation(2,5.5*3.1415/4));
            var body2shoulder = Mat.rotation(2, -5.5*3.1415/4).times(Mat.translation(t.minus()));
            body.children.push(makeShoulder(gl,shoulder2body,body2shoulder))
        }
        //right leg
        {
            var t = new PV(0.3, -0.707, 0.1, false);
            var glute2body = Mat.translation(t);
            var body2glute = Mat.translation(t.minus());
            body.children.push(makeUpperLeg(gl,glute2body,body2glute))
        }
        //left leg
        {
            var t = new PV(-0.3, -0.707, 0.1, false);
            var glute2body = Mat.translation(t);
            var body2glute = Mat.translation(t.minus());
            body.children.push(makeUpperLeg(gl,glute2body,body2glute))
        }
    }
    else if(robot == 1) {
        var sphere = new Sphere(gl, 4, 2);
        var sphere2part = Mat.scale(new PV(1, 3, 1, true))
            .times(Mat.rotation(0, 0 /*Math.PI/4*/));
        var part2sphere = Mat.rotation(0, 0 /*-Math.PI/4*/)
            .times(Mat.scale(new PV(1.0/1, 1.0/3, 1, true)));
        
        body = new Part(sphere, 1, sphere2part, part2sphere,
                        new Mat(), new Mat());
        
        //HEAD
        {
            var t = new PV(0, 3 * 0.707, 0, false);
            var head2body = Mat.translation(t);
            var body2head = Mat.translation(t.minus());
            body.children.push(makeHead_1(gl, head2body, body2head));
        }

        
        //RIGHT ARM
        {
            var t = new PV(0.8, 0.5, 0, false);
            var child2body =  Mat.translation(t).times(Mat.rotation(2,6.5*3.1415/4));
            var body2child = Mat.rotation(2, -6.5*3.1415/4).times(Mat.translation(t.minus()));
            body.children.push(makeUpperArm(gl, child2body, body2child));
        }
        //LEFT ARM
        {
            let t = new PV(-0.8, 0.5, 0, false);
            var child2body = Mat.translation(t).times(Mat.rotation(2, 5.5*3.1415/4));
            var body2child = Mat.rotation(2, -5.5*3.1415/4).times(Mat.translation(t.minus()));
            body.children.push(makeUpperArm(gl, child2body, body2child));
        }
        //RIGHT LEG
        {
            var t = new PV(0.2, -3 * 0.707, 0, false);
            var child2body = Mat.translation(t).times(Mat.rotation(2, -3.1415/2));
            var body2child = Mat.rotation(2, 3.1415/2).times(Mat.translation(t.minus()));
            body.children.push(makeUpperArm(gl, child2body, body2child));
        }
        //LEFT LEG
        {
            var t = new PV(-0.2, -3 * 0.707, 0, false);
            var child2body = Mat.translation(t).times(Mat.rotation(2, -3.1415/2));
            var body2child = Mat.rotation(2, 3.1415/2).times(Mat.translation(t.minus()));
            body.children.push(makeUpperArm(gl, child2body, body2child));
        }
    }
    else{
        
        body = makeBall(gl,new Mat(), new Mat(),0.1)
        body.children.push(makeBall(gl,new Mat(), new Mat(),1.4))
    }
    return body;
}


        

    
