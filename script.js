var audioInput = null;
var file = null;
var fileName = "";
var playButton = null;
var buttonDisabled = true;
var audioContext = null;
var audioBufferSourceNode = null;
var audioPlaying = false;
var canvas = null;
var ctx = null;
var elapsedTime = 0;
var startTime = 0;
var durationTime = 0;
var analyser = null;
var audioDrawingArray = null;
var radius = 150;
var graphSize = 150;
var xc = 0;
var yc = 0;
var i = 0;
var animationFrameId = null;
var lastTimeStamp = 0;
var textX = 200;
var textStopState = 1;
var textStopStartTimeStamp = -1;
var volume = 0.75;
var audioGainNode = null;
var volumeAnimation = 0;

window.onload = function()
{
	console && console.log("%cFancy Audio\n%cFancy HTML5 Audio Visualizer\nCopyright 2015 NIPE-SYSTEMS", "font-size: 1.5em; font-weight: bold;", "font-size: 1em;");
	
	window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
	window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.msCancelAnimationFrame;
	
	try
	{
		audioContext = new AudioContext();
	}
	catch(error)
	{
		console.error(error);
	}
	
	audioInput = document.getElementById("chooser-input");
	audioInput.onchange = cbInputChange;
	
	playButton = document.getElementById("chooser-button");
	playButton.onclick = cbButtonClick;
	disableButton();
	
	canvas = document.getElementById("scene-canvas");
	ctx = canvas.getContext("2d");
	
	if(canvas.addEventListener)
	{
		// IE9, Chrome, Safari, Opera
		canvas.addEventListener("mousewheel", cbCanvasScroll, false);
		// Firefox
		canvas.addEventListener("DOMMouseScroll", cbCanvasScroll, false);
	}
	// IE 6/7/8
	else
	{
		canvas.attachEvent("onmousewheel", cbCanvasScroll);
	}
};

function cbCanvasScroll(e)
{
	var e = window.event || e;
	var detail = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	
	if(detail > 0)
	{
		volume = Math.min(1, volume + 0.025);
	}
	else
	{
		volume = Math.max(0, volume - 0.025);
	}
	
	if(audioGainNode != null)
	{
		console.log("Volume set to: " + volume);
		audioGainNode.gain.value = volume;
	}
	
	volumeAnimation = 300;
}

function cbInputChange()
{
	if(audioInput.files.length != 0)
	{
		file = audioInput.files[0];
		fileName = file.name;
		
		// console.log("Play audio: " + fileName);
		
		enableButton();
	}
}

function disableButton()
{
	buttonDisabled = true;
	document.getElementById("chooser-button").className = "disabled";
}

function enableButton()
{
	buttonDisabled = false;
	document.getElementById("chooser-button").className = "";
}

function cbButtonClick()
{
	if(!buttonDisabled)
	{
		var fileReader = new FileReader();
		fileReader.onload = function(e)
		{
			var fileResult = e.target.result;
			if(audioContext == null)
			{
				return;
			}
			audioContext.decodeAudioData(fileResult, function(buffer)
			{
				setTimeout(function() { visualize(buffer); }, 1000);
				
				showScene();
			}, function(error)
			{
				console.error(error);
			});
		};
		fileReader.onerror = function(error)
		{
			console.error(error);
		};
		
		fileReader.readAsArrayBuffer(file);
	}
}

function showScene()
{
	clearDraw();
	
	document.getElementById("chooser").className = "hidden";
	document.getElementById("scene").className = "";
}

function showChooser()
{
	document.getElementById("chooser").className = "";
	document.getElementById("scene").className = "hidden";
}

function visualize(buffer)
{
	audioBufferSourceNode = audioContext.createBufferSource();
	analyser = audioContext.createAnalyser();
	audioGainNode = audioContext.createGain();
	
	audioBufferSourceNode.buffer = buffer;
	analyser.smoothingTimeConstant = 0.75;
	audioGainNode.gain.value = volume;
	
	audioBufferSourceNode.connect(analyser);
	analyser.connect(audioGainNode);
	audioGainNode.connect(audioContext.destination);
	
	audioBufferSourceNode.start();
	
	audioPlaying = true;
	startTime = audioContext.currentTime;
	durationTime = buffer.duration;
	
	draw(0);
	
	audioBufferSourceNode.onended = function()
	{
		audioBufferSourceNode.stop();
		
		if(animationFrameId !== null)
		{
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		
		audioPlaying = false;
		showChooser();
	};
}

function generateTime(seconds)
{
	var minutes = Math.floor(seconds / 60);
	var seconds = Math.floor(seconds % 60);
	
	return ((minutes < 10)?("0" + minutes):(minutes)) + ":" + ((seconds < 10)?("0" + seconds):(seconds));
}

function clearDraw()
{
	ctx.clearRect(0, 0, 600, 600);
	
	ctx.fillStyle = "#FFFFFF";
	ctx.strokeStyle = "#DDDDDD";
	ctx.beginPath();
	ctx.arc(300, 300, radius, 0, 2 * Math.PI, false);
	ctx.fill();
	ctx.stroke();
	
	ctx.fillStyle = "#222222";
	ctx.font = "100 75px Roboto";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("00:00", 300, 300);
}

function draw(currentTimeStamp)
{
	elapsedTime = audioContext.currentTime - startTime;
	audioDrawingArray = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(audioDrawingArray);
	
	ctx.clearRect(0, 0, 600, 600);
	
	ctx.lineWidth = 1.0;
	ctx.fillStyle = "#FFFFFF";
	ctx.strokeStyle = "#DDDDDD";
	ctx.beginPath();
	ctx.moveTo(300 + Math.cos(0.5 * Math.PI) * (radius + (audioDrawingArray[0] / 256 * graphSize)), 300 + Math.sin(0.5 * Math.PI) * (radius + (audioDrawingArray[0] / 256 * graphSize)));
	
	for(i = 1; i < (audioDrawingArray.length / 4); i++)
	{
		xc = ((300 + Math.cos((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))) + (300 + Math.cos((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize)))) / 2;
		yc = ((300 + Math.sin((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))) + (300 + Math.sin((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize)))) / 2;
		ctx.quadraticCurveTo((300 + Math.cos((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), (300 + Math.sin((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), xc, yc);
	}
	
	ctx.quadraticCurveTo((300 + Math.cos((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), (300 + Math.sin((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), (300 + Math.cos((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize))), (300 + Math.sin((0.5 - (i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize))));
	
	ctx.moveTo(300 + Math.cos(0.5 * Math.PI) * (radius + (audioDrawingArray[0] / 256 * graphSize)), 300 + Math.sin(0.5 * Math.PI) * (radius + (audioDrawingArray[0] / 256 * graphSize)));
	
	for(i = 1; i < (audioDrawingArray.length / 4); i++)
	{
		xc = ((300 + Math.cos((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))) + (300 + Math.cos((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize)))) / 2;
		yc = ((300 + Math.sin((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))) + (300 + Math.sin((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize)))) / 2;
		ctx.quadraticCurveTo((300 + Math.cos((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), (300 + Math.sin((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), xc, yc);
	}
	
	ctx.quadraticCurveTo((300 + Math.cos((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), (300 + Math.sin((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i] / 256 * graphSize))), (300 + Math.cos((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize))), (300 + Math.sin((0.5 - (4 - i / audioDrawingArray.length * 4)) * Math.PI) * (radius + (audioDrawingArray[i + 1] / 256 * graphSize))));
	
	ctx.fill();
	ctx.stroke();
	
	ctx.beginPath();
	ctx.arc(300, 300, radius, 0, 2 * Math.PI, false);
	ctx.fill();
	ctx.stroke();
	
	ctx.strokeStyle = "#3E9DFF";
	ctx.lineWidth = 2.0;
	ctx.beginPath();
	ctx.arc(300, 300, 150, -0.5 * Math.PI, (elapsedTime / durationTime) * Math.PI * 2 - (0.5 * Math.PI), false);
	ctx.stroke();
	
	ctx.globalAlpha = (100 - Math.max(Math.min(volumeAnimation, 100), 0)) / 100;
	
	ctx.fillStyle = "#222222";
	ctx.font = "100 75px Roboto";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(generateTime(elapsedTime), 300, 300);
	
	ctx.fillStyle = "#888888";
	ctx.font = "100 25px Roboto";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("-" + generateTime(durationTime - elapsedTime), 300, 375);
	
	ctx.save();
	ctx.beginPath();
	ctx.rect(200, 220, 200, 30);
	ctx.clip();
	
	ctx.fillStyle = "#AAAAAA";
	ctx.font = "400 13px Roboto";
	if(ctx.measureText(fileName).width > 200)
	{
		// animate
		switch(textStopState)
		{
			case 0:
			{
				textX -= (currentTimeStamp - lastTimeStamp) / 25;
				if(textX <= 200)
				{
					textStopState = 1;
				}
				break;
			}
			case 1:
			{
				textX = 200;
				if(textStopStartTimeStamp == -1)
				{
					textStopStartTimeStamp = currentTimeStamp;
				}
				if(currentTimeStamp - textStopStartTimeStamp > 5000)
				{
					textStopStartTimeStamp = -1;
					textStopState = 2;
				}
				break;
			}
			case 2:
			{
				textX -= (currentTimeStamp - lastTimeStamp) / 25;
				if(textX <= 200 - ctx.measureText(fileName).width)
				{
					textX = 400;
					textStopState = 0;
				}
				break;
			}
		}
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(fileName, textX, 240);
	}
	else
	{
		ctx.textAlign = "center";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(fileName, 300, 240);
	}
	ctx.restore();
	
	ctx.globalAlpha = (Math.max(Math.min(volumeAnimation, 150), 50) - 50) / 100;
	
	ctx.fillStyle = "#222222";
	ctx.font = "100 75px Roboto";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(Math.round(volume * 100) + "%", 300, 300);
	
	ctx.globalAlpha = 1;
	
	if(volumeAnimation > 0)
	{
		volumeAnimation -= (currentTimeStamp - lastTimeStamp) / 5;
	}
	
	// bug workaround, see https://code.google.com/p/chromium/issues/detail?id=403908
	if(audioPlaying && elapsedTime / durationTime > 1)
	{
		console.log("Manually dispatch 'ended' event...\nsee https://code.google.com/p/chromium/issues/detail?id=403908");
		var e = new Event("ended");
		audioBufferSourceNode.dispatchEvent(e);
	}
	
	if(audioPlaying)
	{
		animationFrameId = requestAnimationFrame(draw);
	}
	
	lastTimeStamp = currentTimeStamp;
}