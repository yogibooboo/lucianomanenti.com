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
tmcursoreblu=new Image();
tmcursoreblu.src="cursoreblu.png";




canvascrono = document.getElementById("canvascrono");
ctxmt = canvascrono.getContext('2d');
canvascrono.width=    $("#cursoridiv").width();
canvascrono.height=$("#cursoridiv").height();
var posizioni = [0,10,20,30,40,50,60,70,80,90,100,95,85,75,65,55,45,35,25,15,5,2.25,7.5,12.25,50];
var mintemp=9;
var maxtemp=24;
var rangetemp=maxtemp-mintemp;

var ccw=canvascrono.width;
var cch=canvascrono.height;
var ccoffsetl=ccw*0.025;
var ccoffseth=cch*0.105;
var ccwcursore=ccw*0.018;
var cchcursore=cch/11;
var ccstepcursore=ccw*0.03905;  //step orizzontale
var ccrangecursore=cch*0.0069;  //range cursore verticale diviso 100
var fccselected=false;
var ccselected=0;
var	ccdownx=0;
var	ccdowny=0;
var	cccurrentx=0;
var	cccurrenty=0;
var ccposizionedown=0;	



var tcrono = {
  start:function(){
    tcrono.inizializzazioni();
    tcrono.resetgrafici();
   
  },


    cronodown:function(ev){
    	var x  = (ev.offsetX || ev.clientX - $(ev.target).offset().left);
		var y  = (ev.offsetY || ev.clientY - $(ev.target).offset().top);
   	    log("down "+x+" "+y);
   	    if (x>(ccoffsetl-ccstepcursore/3) && x<(ccoffsetl+24.66*ccstepcursore)){
   	        fccselected=true;
   	        ccselected=parseInt((x+ccstepcursore/3-ccoffsetl)/ccstepcursore);
   	        ccdownx=x;
   	        ccdowny=y;
   	        cccurrentx=x;
   	        cccurrenty=y;
   	        ccposizionedown=posizioni[ccselected];	
   	    } 
   	    tcrono.initcrono();
 
    },
    cronomove:function(ev){
    	if (fccselected) {
			var x  = (ev.offsetX || ev.clientX - $(ev.target).offset().left);
			var y  = (ev.offsetY || ev.clientY - $(ev.target).offset().top);
			log("move "+x+" "+y);

            //calcola il delta posizione y in percentuale e la usa per aggiornare la posizione del cursore
            //il campo utile in verticale ha lo 0 in alto e cresce verso il basso.
            //ccoffseth corrisponde al 100% del valore
            //ccoffseth+ccrangecursore*100 corrisponde allo 0

            var delta = (y-ccdowny)/(ccrangecursore);
            var valore =Math.min(100, Math.max(0, ccposizionedown-delta))
            posizioni[ccselected]=valore;
            if (ccselected==24) {
            	for (var i=0; i<24;i++) {
            		posizioni[i]=valore;
            	}
            }
			log("move "+x+" "+y + " " +  (y-ccdowny)+" "+ delta);

			tcrono.initcrono();
    	}

    },

    cronoup:function(ev){
    	var x  = (ev.offsetX || ev.clientX - $(ev.target).offset().left)/canvascrono.width;
		var y  = (ev.offsetY || ev.clientY - $(ev.target).offset().top)/canvascrono.height;
   	    log("up "+x+" "+y);
   	    fccselected=false;
   	    tcrono.initcrono();

    },


  resetgrafici:function(){

    setTimeout(tcrono.initcrono,500);
    
  },


  inizializzazioni: function(){
		
  },
		
  
  initcrono:function() {
    
    
    
		ctxmt.fillStyle="green";
		ctxmt.font=(18*ccw/1500)+"px Verdana";
		ctxmt.fillRect(0,0,ccw,cch);
		ctxmt.drawImage(tmcrono, 0, 0,ccw,cch);    
		for (var i=0; i<25;i++){
		    tcrono.drawcursore(i,posizioni[i]);  
		}



		for (var i=mintemp; i<=maxtemp;i++){
		    ctxmt.fillStyle="black";

		    if ((i-mintemp)%4==3) ctxmt.fillStyle="brown";

            ctxmt.fillText(i,ccoffsetl*0.3,ccoffseth*1.6+(ccrangecursore*100/rangetemp)*(maxtemp-i));
	    }

   },

    drawcursore:function(n,p) {
    	//n numero cursore 0-23
    	//p posizione percentuale della corsa
    	//scrive su canvascrono
    	ctxmt.fillStyle="green";
    	var intero=false;
    	var settemperatura=(mintemp+rangetemp*posizioni[ccselected]/100).toFixed(1);
    	if (settemperatura%1==0) intero=true;

    	if (fccselected && (n==0)){   //disegna riga di livello
    	    if (intero) ctxmt.fillStyle="red"; 
    		ctxmt.fillRect(0,cch-ccoffseth*1.05-posizioni[ccselected]*ccrangecursore-cchcursore/2,ccw,cch/100);
            ctxmt.fillStyle="green";

    	}
	    if (fccselected && (n==ccselected)){
            ctxmt.drawImage(tmcursoresel,ccoffsetl+ccstepcursore*n,cch-ccoffseth-p*ccrangecursore-cchcursore,ccwcursore,cchcursore);
    	    if (intero) ctxmt.fillStyle="red"; // per il numero scritto dopo

	    }
	    else{
	    	if (n==24){
                ctxmt.drawImage(tmcursoreblu,ccoffsetl+ccstepcursore*n,cch-ccoffseth-p*ccrangecursore-cchcursore,ccwcursore,cchcursore);

	    	} else {
                ctxmt.drawImage(tmcursore,ccoffsetl+ccstepcursore*n,cch-ccoffseth-p*ccrangecursore-cchcursore,ccwcursore,cchcursore);
	    	}
	    }        

        ctxmt.fillText((mintemp+rangetemp*p/100).toFixed(1),ccoffsetl+ccstepcursore*n,cch*0.05);
        
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