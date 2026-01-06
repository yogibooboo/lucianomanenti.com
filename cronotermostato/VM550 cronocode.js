var gateway = `ws://${window.location.hostname}/ws`;
var websocket;

function log(msg) {
    if (window.console && log.enabled) {
        console.log(msg);
    } 
} // log   
log.enabled = true;

$('#canvascrono').mousedown(function (ev) {
	tcrono.cronodown(ev);
});

$('#canvascrono').mousemove(function (ev) {
	tcrono.cronomove(ev);
});  


$('#canvascrono').mouseup(function (ev) {
	tcrono.cronoup(ev);
});

tmcrono=new Image();
tmcrono.src="cronotermostato_fondo.jpg";

tmcursore=new Image();
tmcursore.src="cursore.png";
tmcursoresel=new Image();
tmcursoresel.src="cursoresel.png";
canvascrono = document.getElementById("canvascrono");
ctxmt = canvascrono.getContext('2d');
canvascrono.width=    $("#cursoridiv").width();
canvascrono.height=$("#cursoridiv").height();
var posizioni = [0,10,20,30,40,50,60,70,80,90,100,95,85,75,65,55,45,35,25,15,5,2.25,7.5,12.25];
var mintemp=9;
var maxtemp=24;
var rangetemp=maxtemp-mintemp;

var ccw=canvascrono.width;
var cch=canvascrono.height;
var ccoffsetl=ccw*0.025;
var ccoffseth=cch*0.195;
var ccwcursore=ccw*0.018;
var cchcursore=cch/11;
var ccstepcursore=ccw*0.03905;
var ccrangecursore=cch*0.0069;



var tcrono = {
  start:function(){
    tcrono.inizializzazioni();
    tcrono.resetgrafici();
   
  },


    cronodown:function(ev){
    	var x  = (ev.offsetX || ev.clientX - $(ev.target).offset().left)/canvascrono.width*100;
		var y  = (ev.offsetY || ev.clientY - $(ev.target).offset().top)/canvascrono.height*100;
   	    log("down "+x+" "+y);
 
    },
    cronomove:function(ev){
    	var x  = (ev.offsetX || ev.clientX - $(ev.target).offset().left)/canvascrono.width*100;
		var y  = (ev.offsetY || ev.clientY - $(ev.target).offset().top)/canvascrono.height*100;
   	    log("move "+x+" "+y);
    },

    cronoup:function(ev){
    	var x  = (ev.offsetX || ev.clientX - $(ev.target).offset().left)/canvascrono.width*100;
		var y  = (ev.offsetY || ev.clientY - $(ev.target).offset().top)/canvascrono.height*100;
   	    log("up "+x+" "+y);
    },


  resetgrafici:function(){

    setTimeout(tcrono.initcrono,100,ctxmt,canvascrono.width,canvascrono.height);
    
  },


  inizializzazioni: function(){
		
  },
		
  
  initcrono:function(b,w,h) {
    
    
    
		b.fillStyle="green";
		b.font=(18*w/1500)+"px Verdana";
		b.fillRect(0,0,w,h);
		b.drawImage(tmcrono, 0, 0,w,h);    
		for (var i=0; i<24;i++){
		    tcrono.drawcursore(i,posizioni[i]);  

		}

   },

    drawcursore:function(n,p) {
    	//n numero cursore 0-23
    	//p posizione percentuale della corsa
    	//scrive su canvascrono
        
        ctxmt.drawImage(tmcursore,ccoffsetl+ccstepcursore*n,cch-ccoffseth-p*ccrangecursore,ccwcursore,cchcursore);
        ctxmt.fillText((mintemp+rangetemp*p/100).toFixed(1),ccoffsetl+ccstepcursore*n,h*0.05);
    }


}

function aggiustavista() {
    canvascrono = document.getElementById("canvascrono");
    ctxmt = canvascrono.getContext('2d');
    canvascrono.width=    $("#cursoridiv").width();
    canvascrono.height=$("#cursoridiv").height();
    tcrono.resetgrafici();
/*    canvascrono.width=    $("#cursoridiv").width();
    canvascrono.height=$("#cursoridiv").height();
	    tcrono.initcrono,100,ctxmt,canvascrono.width,canvascrono.height */
}  

$(document) .ready(function () {

  tcrono.start();

}); 