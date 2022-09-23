"use strict";

var vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// A matrix to transform the positions by
uniform mat3 u_matrix;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  vec2 position = (u_matrix * vec3(a_position, 1)).xy;

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

var fragmentShaderSource = `#version 300 es

precision highp float;

uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  var ScoreElement = document.querySelector("#score");
  const sound = new Audio('./music/eating.wav');  //進食音效
  const bgSound = new Audio('./music/PacManOriginalTheme.mp3'); //背景音樂
  bgSound.volume=0.7;
  bgSound.playbackRate = 0.7;

  // bgSound.autoplay=true;
  // bgSound.play();

  // Use our boilerplate utils to compile the shaders and link into a program
  var program = webglUtils.createProgramFromSources(gl,
      [vertexShaderSource, fragmentShaderSource]);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  // look up uniform locations
  var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  var colorLocation = gl.getUniformLocation(program, "u_color");
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  // First let's make some variables
  // to hold the translation,
  var translation = [gl.canvas.offsetWidth/2, gl.canvas.offsetHeight/2];
  var rotationInRadians = Math.PI / 180;
  var rotationInRadians2;
  var scale = [0.85, 0.85];
  var color = [Math.random(), Math.random(), Math.random(), 0.5];
  var num = 0;
  var arr = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], 
  [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
  var SnakeLen = 1;
  var score = 0;
  var FoodNum = 16;

  var drawInfos = [];
  var numToDraw = 1;
  var speed = 80;
  for (var ii = 0; ii < numToDraw; ++ii) {
    var drawInfo = {
      x: gl.canvas.offsetWidth/2,
      y: gl.canvas.offsetHeight/2,
      dx: -1,
      dy: -1,
    };
    drawInfos.push(drawInfo);
  }
  //依照角度來調整蛇前進的方向
  function update(deltaTime) {
    drawInfos.forEach(function(drawInfo) {
      drawInfo.x += drawInfo.dx * speed * deltaTime;
      drawInfo.y += drawInfo.dy * speed * deltaTime;
      if((num < 45 && num >=0) || (num <= 360 && num > 315)){ //左上
        drawInfo.dx = -1;
        drawInfo.dy = -1;
      }
      if(num == 45){  //上
        drawInfo.dx = 0;
        drawInfo.dy = -1;
      }
      if(num > 45 && num < 135){  //右上
        drawInfo.dx = 1;
        drawInfo.dy = -1;
      }
      if(num == 135){ //右
        drawInfo.dx = 1;
        drawInfo.dy = 0;
      }
      if(num > 135 && num < 225){ //右下
        drawInfo.dx = 1;
        drawInfo.dy = 1;
      }
      if(num == 225){             //下
        drawInfo.dx = 0;
        drawInfo.dy = 1;
      }
      if(num > 225 && num < 315){   //左下
        drawInfo.dx = -1;
        drawInfo.dy = 1;
      }
      if(num == 315){             //左
        drawInfo.dx = -1;
        drawInfo.dy = 0;
      }
      //碰到牆壁時不會超出去
      if (drawInfo.x < gl.canvas.offsetWidth/2 - gl.canvas.offsetWidth/4) {
        drawInfo.dx = 1;
      }
      if (drawInfo.x >= gl.canvas.offsetWidth/2 + gl.canvas.offsetWidth/4) {
        drawInfo.dx = -1;
      }
      if (drawInfo.y < gl.canvas.offsetHeight/2 - gl.canvas.offsetHeight/4) {
        drawInfo.dy = 1;
      }
      if (drawInfo.y >= gl.canvas.offsetHeight/2 + gl.canvas.offsetHeight/4) {
        drawInfo.dy = -1;
      }
    });
  }

  var m = Math.random(), n = Math.random();
  var then = 0;
  var first = true;
  function render(time) {
    time *= 0.001;
    var now = time;
    var deltaTime = Math.min(0.1, now - then);
    then = now;
    bgSound.autoplay=true;  //自動播放背景音樂
    bgSound.play();

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    document.addEventListener('keydown', onKeyDown, false);
    //將角度限制在0~360間
    if(num>360){
      num-=360;
    }
    else if (num < 0){
      num+=360;
    }
    update(deltaTime);
    speed = 80;
    translation[0]=drawInfo.x;
    translation[1]=drawInfo.y;

    rotationInRadians = (360 - num) * Math.PI / 180 + Math.sin(time * 2.2) / 5;
    rotationInRadians2=Math.sin(time * 2.2) / 5;
    drawWall();
    //達到某個分數做變化
    if(score>=10 && score < 20){
      FoodNum = 12; //食物變少
      color[3] = 0.8; //變色
      bgSound.playbackRate = 1; //背景音樂加速
    }
    else if(score>=20){
      FoodNum = 8;
      color[3] = 1;
      bgSound.playbackRate = 1.2;
    }
    if(first){
      drawFood(m, n);
    }
    else{
      drawFood();
    }
    eatFood();
    drawSnake();
    //判斷有無吃到食物
    function eatFood() {
      for(var i = 0; i < FoodNum; i++){
        if(translation[0] - 1>=arr[i][0] && translation[0]<=arr[i][0] + 11){  //看點的座標
          if(translation[1] - 1>=arr[i][1]&&translation[1]<=arr[i][1] + 11){
            first = false;
            arr[i][0] = gl.canvas.offsetWidth/4+gl.canvas.offsetWidth/2*Math.random();  //換新的食物位置
            arr[i][1] = gl.canvas.offsetHeight/4+gl.canvas.offsetHeight/2*Math.random();
            if(arr[i][1]+10>=3*gl.canvas.offsetHeight/4){
                arr[i][1]-=10;
            }
            if(arr[i][0]+10>=3*gl.canvas.offsetWidth/4){
                arr[i][0]-=10;
            }
            drawFood();
            sound.play(); //吃到食物時，發出進食的音效
            SnakeLen++; //增加蛇的長度
            score+=2; //增加分數
            break;
          }
        }
      }
    }
    ScoreElement.textContent = score;

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  //控制左右轉及加減速
  function onKeyDown(event)
  {
    if (event.key == 'a')
    {
      num--;
    }
    else if (event.key == 'd')
    {
      num++;
    }
    else if (event.key == 'w')
    {
      speed+=150;
    }
    else if (event.key == 's')
    {
      speed-=100;
    }
  }

  //畫蛇
  function drawSnake() {
    var positionBuffer = gl.createBuffer();

    // Create a vertex array object (attribute state)
    var vao = gl.createVertexArray();
  
    // and make it the one we're currently working with
    gl.bindVertexArray(vao);
  
    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
  
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    var snake = [
        0, 0,
        0, 100,
       50, 50,
       50, 50,
         0, 0,
       100, 0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(snake), gl.STATIC_DRAW);

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);


    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // Set the color.
    gl.uniform4fv(colorLocation, color);

      // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset);


    // Compute the matrices
    var translationMatrix = m3.translation(translation[0], translation[1]);
    var rotationMatrix = m3.rotation(rotationInRadians);
    var scaleMatrix = m3.scaling(scale[0], scale[1]);

    // Starting Matrix.
    var matrix = m3.identity();

    for (var i = 0; i < SnakeLen; ++i) {
      //不讓蛇身隨便亂動
      if (i > 0) {
        translationMatrix = m3.translation(40, 45);
        rotationMatrix = m3.rotation(rotationInRadians2);
      }
      // Multiply the matrices.
      matrix = m3.multiply(matrix, translationMatrix);
      matrix = m3.multiply(matrix, rotationMatrix);
      matrix = m3.multiply(matrix, scaleMatrix);

      // Set the matrix.
      gl.uniformMatrix3fv(matrixLocation, false, matrix);

      // Draw the geometry.
      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      var count = 6;
      gl.drawArrays(primitiveType, offset, count);
    }
  }
  //畫牆壁
  function drawWall() {
    // outColor = vec4(1, 0, 0.5, 1);
    // Create a buffer and put three 2d clip space points in it
    var positionBuffer = gl.createBuffer();
  
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    var positions = [
      gl.canvas.offsetWidth/4 - 10, gl.canvas.offsetHeight/4 - 10,
      3*gl.canvas.offsetWidth/4 + 10, gl.canvas.offsetHeight/4 - 10,
      gl.canvas.offsetWidth/4 - 10, gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4 - 10, gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4 + 10, gl.canvas.offsetHeight/4 - 10,
      3*gl.canvas.offsetWidth/4 + 10, gl.canvas.offsetHeight/4,

      gl.canvas.offsetWidth/4 - 10, gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4, gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4 - 10, 3*gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4 - 10, 3*gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4, gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4, 3*gl.canvas.offsetHeight/4,

      3*gl.canvas.offsetWidth/4, gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4 + 10, gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4, 3*gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4, 3*gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4 + 10, gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4 + 10, 3*gl.canvas.offsetHeight/4,

      gl.canvas.offsetWidth/4 - 10, 3*gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4 + 10, 3*gl.canvas.offsetHeight/4,
      gl.canvas.offsetWidth/4 - 10, 3*gl.canvas.offsetHeight/4 + 10,
      gl.canvas.offsetWidth/4 - 10, 3*gl.canvas.offsetHeight/4 + 10,
      3*gl.canvas.offsetWidth/4 + 10, 3*gl.canvas.offsetHeight/4,
      3*gl.canvas.offsetWidth/4 + 10, 3*gl.canvas.offsetHeight/4 + 10,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  
    // Create a vertex array object (attribute state)
    var vao = gl.createVertexArray();
  
    // and make it the one we're currently working with
    gl.bindVertexArray(vao);
  
    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
  
    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset);
  
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    
    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);
  
    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);
  
    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
  
    // Set the color.
    gl.uniform4f(colorLocation, 21/255, 60/255, 87/255, 1);

    var matrix = m3.identity();
    gl.uniformMatrix3fv(matrixLocation, false, matrix);


    // draw
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 24;
    gl.drawArrays(primitiveType, offset, count);
  }
  //畫食物
  function drawFood(a, b) {
    var positionBuffer = gl.createBuffer();

    // Create a vertex array object (attribute state)
    var vao = gl.createVertexArray();
  
    // and make it the one we're currently working with
    gl.bindVertexArray(vao);
  
    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);
  
    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
    var food = [
        0, 0,
        10, 0,
        0, 10,
        0, 10,
        10, 0,
        10, 10,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(food), gl.STATIC_DRAW);

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);


    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

      // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset);

    var translationMatrix;

    for (var i = 0; i < FoodNum; ++i) {
      //產生隨機位置
      var x = Math.sqrt(a*(i+1)) - parseInt(Math.sqrt(a*(i+1)));
      var y = Math.sqrt(b*(i+1)) - parseInt(Math.sqrt(b*(i+1)));
      var matrix = m3.identity();
      //快速變顏色
      gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);

      //讓食物分散在四個象限
      if(first){
        if(i % 4 == 0){
          arr[i][0] = gl.canvas.offsetWidth/4 + gl.canvas.offsetWidth/4 * x;
          arr[i][1] = gl.canvas.offsetHeight/4 + gl.canvas.offsetHeight/4 * y;
          translationMatrix = m3.translation(arr[i][0], arr[i][1]);
        }
        else if (i % 4 == 1){
          arr[i][0] = gl.canvas.offsetWidth/4 + gl.canvas.offsetWidth/4 * x;
          arr[i][1] = 3*gl.canvas.offsetHeight/4 - gl.canvas.offsetHeight/4 * y;
          if(arr[i][1]+10>=3*gl.canvas.offsetHeight/4){
            arr[i][1]-=10;
          }
          translationMatrix = m3.translation(arr[i][0], arr[i][1]);
        }
        else if (i % 4 == 2){
          arr[i][0] = 3*gl.canvas.offsetWidth/4 - gl.canvas.offsetWidth/4 * x;
          arr[i][1] = gl.canvas.offsetHeight/4 + gl.canvas.offsetHeight/4 * y;
          if(arr[i][0]+10>=3*gl.canvas.offsetWidth/4){
            arr[i][0]-=10;
          }
          translationMatrix = m3.translation(arr[i][0], arr[i][1]);
        }
        else if (i % 4 == 3){
          arr[i][0] = 3*gl.canvas.offsetWidth/4 - gl.canvas.offsetWidth/4 * x;
          arr[i][1] = 3*gl.canvas.offsetHeight/4 - gl.canvas.offsetHeight/4 * y;
          if(arr[i][1]+10>=3*gl.canvas.offsetHeight/4){
            arr[i][1]-=10;
          }
          if(arr[i][0]+10>=3*gl.canvas.offsetWidth/4){
            arr[i][0]-=10;
          }
          translationMatrix = m3.translation(arr[i][0], arr[i][1]);
        }  
      }
      else{
        translationMatrix = m3.translation(arr[i][0], arr[i][1]);
      }
      // Multiply the matrices.
      matrix = m3.multiply(matrix, translationMatrix);

      // Set the matrix.
      gl.uniformMatrix3fv(matrixLocation, false, matrix);

      // Draw the geometry.
      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      var count = 6;
      gl.drawArrays(primitiveType, offset, count);
    }  
  }
  
}

var m3 = {
  identity: function identity() {
    return [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
  },

  translation: function translation(tx, ty) {
    return [
      1, 0, 0,
      0, 1, 0,
      tx, ty, 1,
    ];
  },

  rotation: function rotation(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ];
  },

  scaling: function scaling(sx, sy) {
    return [
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1,
    ];
  },

  multiply: function multiply(a, b) {
    var a00 = a[0 * 3 + 0];
    var a01 = a[0 * 3 + 1];
    var a02 = a[0 * 3 + 2];
    var a10 = a[1 * 3 + 0];
    var a11 = a[1 * 3 + 1];
    var a12 = a[1 * 3 + 2];
    var a20 = a[2 * 3 + 0];
    var a21 = a[2 * 3 + 1];
    var a22 = a[2 * 3 + 2];
    var b00 = b[0 * 3 + 0];
    var b01 = b[0 * 3 + 1];
    var b02 = b[0 * 3 + 2];
    var b10 = b[1 * 3 + 0];
    var b11 = b[1 * 3 + 1];
    var b12 = b[1 * 3 + 2];
    var b20 = b[2 * 3 + 0];
    var b21 = b[2 * 3 + 1];
    var b22 = b[2 * 3 + 2];

    return [
      b00 * a00 + b01 * a10 + b02 * a20,
      b00 * a01 + b01 * a11 + b02 * a21,
      b00 * a02 + b01 * a12 + b02 * a22,
      b10 * a00 + b11 * a10 + b12 * a20,
      b10 * a01 + b11 * a11 + b12 * a21,
      b10 * a02 + b11 * a12 + b12 * a22,
      b20 * a00 + b21 * a10 + b22 * a20,
      b20 * a01 + b21 * a11 + b22 * a21,
      b20 * a02 + b21 * a12 + b22 * a22,
    ];
  },
};

main();
