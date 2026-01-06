var gateway = `ws://${window.location.hostname}/ws`;
var websocket;

canvasmetronomo = document.getElementById("canvasmetronomo");
ctxmt = canvasmetronomo.getContext('2d');

canvasimposta = document.getElementById("canvasimposta");
ctxim = canvasimposta.getContext('2d');

tmmetronomo=new Image();
tmmetronomo.src="cronotermostato.jpg";
tmmetroasta=new Image();
tmmetroasta.src="metroasta.png";
tmmetroindex=new Image();
tmmetroindex.src="metroindex.png";
tmmetrosotto=new Image();
tmmetrosotto.src="metrosotto.png";

/* window.addEventListener('load', onload);

function  onload(event) {
  initWebSocket();
  getCurrentValue();
} 

function initWebSocket() {
  console.log('Trying to open a WebSocket connection…');
  websocket = new WebSocket(gateway);
  websocket.onopen    = onOpen;
  websocket.onclose   = onClose;
  websocket.onmessage = onMessage;
}

function onOpen(event) {
  console.log('Connection opened');
}

function onClose(event) {
  console.log('Connection closed');
  setTimeout(initWebSocket, 2000);
} 

function onMessage(event) {
  console.log(event.data);
}

function getCurrentValue(){
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("pwmSlider").value = this.responseText;
      document.getElementById("textSliderValue").innerHTML = this.responseText;
    }
  };
  xhr.open("GET", "/currentValue", true);
  xhr.send();
}

function updateSliderPWM(element) {
  var sliderValue = document.getElementById("pwmSlider").value;
  document.getElementById("textSliderValue").innerHTML = sliderValue;
  console.log(sliderValue);
  websocket.send(sliderValue);
}

*/
var tmidi = {
  start:function(){
    	
    tmidi.inizializzazioni();
    tmidi.resetgrafici();
   
  },



  resetgrafici:function(){
    setTimeout(tmidi.initmetronomo,100,ctxmt,canvasmetronomo.width,canvasmetronomo.height);
    setTimeout(tmidi.initimposta,100,ctxim,canvasimposta.width,canvasimposta.height);
  },


  inizializzazioni: function(){

		tmidi.fsuona=false;
		tmidi.fpoststop=false;  //dopo lo stop in attesa del fine battuta
		tmidi.fnoteon=false;
		tmidi.fintro=false;
		tmidi.fpreintro=false;
		tmidi.fcancellasuona=false;
		tmidi.inizio=0;
		tmidi.prev=tmidi.inizio;
		tmidi.next=tmidi.inizio;
    	tmidi.fmicrofono=false;

		tmidi.fnosound0=false;  //disabilita i suoni principali
		tmidi.fnoaccent2=false;	//disabilita gli accenti sui suoni secondari	
		tmidi.fnosound2=false;	//disabilita suoni secondari
    	tmidi.fnoaccent0=false;  //disabilita accento suoni principali

    	tmidi.bpm=80;
		tmidi.velocitaout=120;
		tmidi.cbuffer=tmidi.Hanon1;
		tmidi.latenza=0;
		
  },
		
  initimposta:function(b,w,h) {
    b.canvas.hidden=true;
  },

  initmetronomo:function(b,w,h) {

    
    b.fillStyle="#FFFFFF";
    var angolo=0;
    var cursore=-100-300*((120-tmidi.bpm)/80);
    //log ("cursore= "+cursore)
    var tempo=0;

    b.setTransform(1, 0, 0, 1, 0, 0);		
    b.clearRect(0, 0, w,h);

  


    /* if ((tmidi.fsuona||tmidi.fpoststop)&&(tempo>tmidi.inizio)){
      var xinizio=tmidi.prev,xquarto=tmidi.quartonext,xperiodo=tmidi.periodonext,xquarti=tmidi.quartinext;
      if (tempo<tmidi.prev) xinizio=tmidi.prev-tmidi.periodoprev/1000,xquarto=tmidi.quartoprev,xperiodo=tmidi.periodoprev,xquarti=tmidi.quartiprev;
      var periodi=((tempo-xinizio)/(2*xquarto/1000))+xquarti/2
      periodi-=Math.floor(periodi);
      angolo=20*(2-tmidi.bpm/80)*Math.PI/180*Math.sin(periodi*Math.PI*2);
    } */
  
    b.drawImage(tmmetronomo, 0, -40,375,750);
    //b.drawImage(tmmetroasta, 220, 500,10,300);
    b.translate(187,570);
    b.rotate(angolo);
    b.fillRect(0,0,1,-330)
    //b.drawImage(tmmetroasta, -5,0,10,-330);
    //b.drawImage(tmmetroasta, -7,-535,15,495);
    //b.drawImage(tmmetroindex, -24,cursore,50,-40);
    //b.drawImage(tmmetroindex, -36,cursore-60,75,60);

    b.setTransform(1, 0, 0, 1, 0, 0);
    //b.drawImage(tmmetrosotto, 0, 410,375,350);

  },

}

$(document) .ready(function () {

  tmidi.start();

}); 