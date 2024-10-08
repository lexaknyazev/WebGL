/*
Copyright (c) 2019 The Khronos Group Inc.
Use of this source code is governed by an MIT-style license that can be
found in the LICENSE.txt file.
*/
IterableTest = (function() {

  var wtu = WebGLTestUtils;

  function run(test, iterations) {
    var target = iterations || 10;
    var count = 0;

    function doNextTest() {
      ++count;
      debug("Test " + count + " of " + target);
      var success = test();
      if (count < target && success !== false) {
        wtu.dispatchPromise(doNextTest);
      } else {
        finishTest();
      }
    }

    doNextTest();
  }

  // Creates a canvas and a texture then exits. There are
  // no references to either so both should be garbage collected.
  function createContextCreationAndDestructionTest() {
    var textureSize = null;

    return function() {
      var canvas = document.createElement("canvas");
      // This is safe for any device. See drawingBufferWidth in spec.
      canvas.width = 2048;
      canvas.height = 2048;
      var gl = wtu.create3DContext(canvas);
      if (textureSize === null) {
        var maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        textureSize = Math.min(1024, maxTextureSize);
      }
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSize, textureSize, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                    null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      wtu.glErrorShouldBe(gl, gl.NO_ERROR, "Should be no errors");

      return true;
    };
  }

  // Creates many small canvases and attaches them to the DOM.
  // This tests an edge case discovered in Chrome where the creation of multiple
  // WebGL contexts would eventually lead to context creation failure.
  // (crbug.com/319265) The test does not require that old contexts remain
  // valid, only that new ones can be created.
  function createContextCreationTest() {
    return function() {
      var canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;

      document.body.appendChild(canvas);

      var gl = wtu.create3DContext(canvas);
      if (!gl) {
        return false;
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      wtu.glErrorShouldBe(gl, gl.NO_ERROR, "Should be no errors");

      return true;
    };
  }

  // Draws rectangle on a passed canvas with preserveDrawingBuffer
  // and antialiasing ON, tests rect color on every iteration.
  function createMultisampleCorruptionTest(gl) {
    var lastContext = null;
    // Allocate a read back buffer in advance and reuse it for all iterations
    // to avoid memory issues because of late garbage collection.
    var readBackBuf = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);

    var program = wtu.loadStandardProgram(gl);
    var uniforms = wtu.getUniformMap(gl, program);
    gl.useProgram(program);

    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var vertexObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 0,2.5,0, 1.5,1.5,0, 2.5,1.5,0 ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.vertexAttrib3f(1, 0.0, 0.0, 1.0);

    var identityMat = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);

    gl.uniformMatrix4fv(uniforms.u_modelViewProjMatrix.location, false, identityMat);

    var extraHeight = 0;

    function test() {
      var gl2 = wtu.create3DContext(null, {antialias: true});

      gl2.canvas.width = 1024;
      // Make this test a little more stressful by slightly changing the canvas's height each iteration.
      gl2.canvas.height = 1024 + extraHeight;
      extraHeight = (1 + extraHeight) % 4;
      gl2.canvas.style.width = gl2.canvas.style.height = "1px";
      document.body.appendChild(gl2.canvas);

      gl2.clearColor(1.0, 0.0, 0.0, 1.0);
      gl2.clear(gl2.COLOR_BUFFER_BIT);

      if(lastContext) {
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          var msg = "Canvas should be red";
          wtu.checkCanvasRectColor(gl,
              0, 0, gl.canvas.width, gl.canvas.height,
              [255, 0, 0, 255], null,
              function() {
                  testPassed(msg);
              },
              function() {
                  testFailed(msg);
                  return false;
              },
          debug, readBackBuf);
          document.body.removeChild(lastContext.canvas);
      }

      lastContext = gl2;
      return true;
    };

    // First pass does initialization
    test();

    return test;
  }

  // Draws repeatedly to a large canvas with preserveDrawingBuffer enabled to
  // try and provoke a context loss.
  function createPreserveDrawingBufferLeakTest(gl) {
    var contextActive = true;
    gl.canvas.addEventListener("webglcontextlost", () => {
      testFailed("Context was lost");
      contextActive = false;
    });

    function test() {
      var x = Math.random() * gl.drawingBufferWidth;
      var y = Math.random() * gl.drawingBufferHeight;
      var width = Math.random() * (gl.drawingBufferWidth - x);
      var height = Math.random() * (gl.drawingBufferHeight - y);

      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x, y, width, height);
      gl.clearColor(Math.random(), Math.random(), Math.random(), 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      wtu.glErrorShouldBe(gl, gl.NO_ERROR, "Should be no errors");

      return contextActive;
    };

    return test;
  }

  return {
    run: run,

    createContextCreationAndDestructionTest: createContextCreationAndDestructionTest,
    createContextCreationTest: createContextCreationTest,
    createMultisampleCorruptionTest: createMultisampleCorruptionTest,
    createPreserveDrawingBufferLeakTest: createPreserveDrawingBufferLeakTest
  };

})();
