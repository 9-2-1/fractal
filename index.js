let draw = document.getElementById("draw");
let depth_ = document.getElementById("depth_");
let gl = draw.getContext("webgl");

let program, po_wpos, po_scale, po_depth, buffer;

let tr_scale = 1;
let tr_wpos = [0.5, 0];
let tr_depth = 100;

if (gl === null) {
	alert("No webgl");
	throw new Error("webgl");
}

function modiScale() {
	let scale = Math.min(
		(document.body.clientWidth - 40),
		(document.body.clientHeight - 40)
	);
	draw.width = scale;
	draw.height = scale;
	gl.viewport(0, 0, scale, scale);
	draw.style.border = "1px white solid";
}

//gl.clearColor(1.0, 0.0, 0.0, 1.0);
//gl.clear(gl.COLOR_BUFFER_BIT);

draw.addEventListener("touchstart", dragCanvasTouch);
draw.addEventListener("mousedown", dragCanvasMouse);
draw.addEventListener("touchmove", dragCanvasTouch);
draw.addEventListener("mousemove", dragCanvasMouse);
draw.addEventListener("touchend", dragCanvasTouch);
draw.addEventListener("mouseup", dragCanvasStop);
window.addEventListener("mouseleave", dragCanvasStop);
draw.addEventListener("mousewheel", dragCanvasSize);

let of_wpos = null;
let of_scale = null;

function dragCanvasMouse(event) {
	if (event.type === "mousedown")
		event.type = "touchstart";
	else
		event.type = "touchmove";
	event.targetTouches = [{
		clientX: event.clientX,
		clientY: event.clientY
	}];
	dragCanvasTouch(event);
}

function dragCanvasSize(event) {
	of_wpos = [];
	of_wpos[0] = tr_wpos[0] - sum[0] * tr_scale;
	of_wpos[1] = tr_wpos[1] - sum[1] * tr_scale;
	tr_scale *= Math.exp(event.wheelDelta / 120 * Math.ln(1.2));
	tr_wpos[0] = of_wpos[0] + sum[0] * tr_scale;
	tr_wpos[1] = of_wpos[1] + sum[1] * tr_scale;
	of_wpos = null;
}

function dragCanvasStop(event) {
	event.type = "touchend";
	event.targetTouches = [];
	dragCanvasTouch(event);
}

function dragCanvasTouch(event) {
	try {
		let rect = event.target.getBoundingClientRect();
		let sum = [0, 0],
			div = 0,
			cnt = 0;
		let touches = event.targetTouches;
		for (let i = 0; i < touches.length; i++) {
			cnt++;
			sum[0] += touches[i].clientX;
			sum[1] += touches[i].clientY;
			if (i !== 0) {
				let dX = touches[i - 1].clientX - touches[i].clientX;
				let dY = touches[i - 1].clientY - touches[i].clientY;
				div += Math.sqrt(dX * dX + dY * dY);
			}
		}
		sum[0] = -1 + 2 * ((sum[0] / cnt - rect.left) / rect.width);
		sum[1] = 1 + -2 * ((sum[1] / cnt - rect.top) / rect.height);
		div /= cnt - 1;
		if (event.type === "touchmove") {
			if (!isNaN(sum[0])) {
				tr_wpos[0] = of_wpos[0] + sum[0] * tr_scale;
				tr_wpos[1] = of_wpos[1] + sum[1] * tr_scale;
				if (!isNaN(div)) {
					tr_scale = of_scale / div;
				}
			}
		} else {
			of_wpos = null;
			of_scale = null;
			if (!isNaN(sum[0])) {
				of_wpos = [];
				of_wpos[0] = tr_wpos[0] - sum[0] * tr_scale;
				of_wpos[1] = tr_wpos[1] - sum[1] * tr_scale;
				if (!isNaN(div)) {
					of_scale = tr_scale * div;
				}
			}
		}
		gl.uniform2fv(po_wpos, tr_wpos);
		gl.uniform1f(po_scale, tr_scale);
		gl.uniform1i(po_depth, tr_depth);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		event.preventDefault();
	} catch (e) {
		alert(e.message);
	}
}

window.addEventListener("load", function() {
	try {
		modiScale();
		window.addEventListener("resize", modiScale);
		setupWebGL();
		gl.uniform2fv(po_wpos, tr_wpos);
		gl.uniform1f(po_scale, tr_scale);
		gl.uniform1i(po_depth, tr_depth);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		depth_.addEventListener("change", function() {
			tr_depth = depth_.value;
			gl.uniform1i(po_depth, tr_depth);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		});
	} catch (e) {
		alert(e);
	}
});

// https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL

function setupWebGL() {
	var source = document.querySelector("#vertex-shader").innerHTML;
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, source);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		var linkErrLog = gl.getShaderInfoLog(vertexShader);
		cleanup();
		document.querySelector("p").innerText =
			"Shader program did not link successfully. " +
			"Error log: " + linkErrLog;
		return;
	}
	source = document.querySelector("#fragment-shader").innerHTML
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, source);
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		var linkErrLog = gl.getShaderInfoLog(fragmentShader);
		cleanup();
		document.querySelector("p").innerText =
			"Shader program did not link successfully. " +
			"Error log: " + linkErrLog;
		return;
	}
	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.detachShader(program, vertexShader);
	gl.detachShader(program, fragmentShader);
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);
	po_wpos = gl.getUniformLocation(program, "wpos");
	po_scale = gl.getUniformLocation(program, "scale");
	po_depth = gl.getUniformLocation(program, "depth");
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		var linkErrLog = gl.getProgramInfoLog(program);
		cleanup();
		document.querySelector("p").innerText =
			"Shader program did not link successfully. " +
			"Error log: " + linkErrLog;
		return;
	}
	initializeAttributes();
	gl.useProgram(program);
}

function initializeAttributes() {
	gl.enableVertexAttribArray(0);
	buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1, -1, -1, 1, 1, -1,
		1, 1, -1, 1, 1, -1
	]), gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

function cleanup() {
	gl.useProgram(null);
	if (buffer)
		gl.deleteBuffer(buffer);
	if (program)
		gl.deleteProgram(program);
}
