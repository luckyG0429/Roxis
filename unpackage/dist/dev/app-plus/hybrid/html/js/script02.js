
(function(){
var codeRunCtrl;
Runtime.CodeRunImport=function(){
	if(codeRunCtrl==1){
		codeRunCtrl=2;
		throw new Error("kill");
	};
};
Runtime.CodeRunClick=function(isImport){
	$(".mainCtrl").show();
	
	if(!isImport){
		codeRunCtrl=1;
	};
	if(codeRunCtrl==1){
		Runtime.Log("代码开始运行，请勿操作...",1);
	};
	if(codeRunCtrl==3){
		return;
	};
	if(codeRunCtrl==2){
		codeRunCtrl=3;
	};
	
	try{
		var code=$(".codeEdit").val();
		window.eval(code);
		Runtime.Log("代码已运行",2);
	}catch(e){
		if(e.message.indexOf("kill")+1){
			return;
		};
		Runtime.Log("运行出错:"+e.message+"<pre>"+e.stack+"</pre>",1);
	};
};



Runtime.LogAudioPlay=function(id){
	var audio=$(".LogAudioPlayer")[0];
	audio.style.display="inline-block";
	if(!(audio.ended || audio.paused)){
		audio.pause();
	};
	
	var o=Runtime.LogAudios[id];
	if(o){
		o.play=(o.play||0)+1;
		var logmsg=function(msg){
			$(".LogAudio_"+id).html('<span style="color:green">'+o.play+'</span> '+new Date().toLocaleTimeString()+" "+msg);
		};
		logmsg("");
		audio.onerror=function(e){
			console.log(arguments)
			logmsg('<span style="color:red">播放失败</span>');
		};
		
		var end=function(blob){
			audio.src=(window.URL||webkitURL).createObjectURL(blob);
			audio.play();
		};
		var wav=Recorder[o.set.type+"2wav"];
		if(wav){
			logmsg("正在转码成wav...");
			var wavData=o.blob;
			if(o.set.type=="pcm"){
				wavData={
					sampleRate:o.set.sampleRate
					,bitRate:o.set.bitRate
					,blob:o.blob
				};
			};
			wav(wavData,function(blob){
				end(blob);
				logmsg("已转码成wav播放");
			},function(msg){
				logmsg('<span style="color:red">转码成wav失败：'+msg+'</span>');
			});
		}else{
			end(o.blob);
		};
	};
};
var Rnd=0;
Runtime.LogAudioDown=function(id){
	var o=Runtime.LogAudios[id];
	if(o){
		var cls="LogAudioInfo"+(++Rnd);
		var name="rec-"+o.duration+"ms-"+(o.set.bitRate||"-")+"kbps-"+(o.set.sampleRate||"-")+"hz."+(o.set.type||(/\w+$/.exec(o.blob.type)||[])[0]||"unknown");
		
		o.down=(o.down||0)+1;
		$(".LogAudio_"+id).html('<span style="color:red">'+o.down+'</span> 点击 <span class="'+cls+'"> 下载，或复制文本<button onclick="Runtime.LogAudioDown64(\''+id+'\',\''+cls+'\')">生成Base64文本</button></span>');
		
		var downA=document.createElement("A");
		downA.innerHTML="下载 "+name;
		downA.href=(window.URL||webkitURL).createObjectURL(o.blob);
		downA.download=name;
		$("."+cls).prepend(downA);
		if(!/mobile/i.test(navigator.userAgent)){
			downA.click(); //某些软件内会跳转页面到恶心推广页
		}
	};
};
Runtime.LogAudioDown64=function(key, cls){
	var o=Runtime.LogAudios[key];
	
	var reader = new FileReader();
	reader.onloadend = function() {
		var id="LogAudioInfoB64"+(++Rnd);
		$("."+cls).append('<textarea class="'+id+'"></textarea>');
		$("."+id).val(reader.result);
	};
	reader.readAsDataURL(o.blob);
};



Runtime.ViewChoiceFile=function(set){
	set=$.extend({
		multiple:true
		,name:"音乐"
		,title:"转换"
		,mime:"audio/*"
		,process:NOOP //fn(fileName,arrayBuffer,filesCount,fileIdx,endCall)
		,keepOther:false
		,cls:"RuntimeChoiceFile_"+(++Rnd)
	},set);
	
	var cls=set.cls;
	if(!set.keepOther){
		$(".RuntimeChoiceFileBox").remove();
	}
	Runtime.Log('\
<div class="RuntimeChoiceFileBox '+cls+'">\
	<div class="RuntimeChoiceDropFile" onclick="$(\'.'+cls+' .RuntimeChoiceFile\').click()" style="border: 3px dashed #a2a1a1;background:#eee; padding:30px 0; text-align:center;cursor: pointer;">\
	拖拽'+(set.multiple?"多":"一")+'个'+set.name+'文件到这里 / 点此选择，并'+set.title+'\
	</div>\
	<input type="file" class="RuntimeChoiceFile" style="display:none" accept="'+set.mime+'" '+(set.multiple?'multiple="multiple"':'')+'>\
</div>');
	$("."+cls+" .RuntimeChoiceDropFile").bind("dragover",function(e){
		e.preventDefault();
	}).bind("drop",function(e){
		e.preventDefault();
		
		readChoiceFile(e.originalEvent.dataTransfer.files);
	});
	$("."+cls+" .RuntimeChoiceFile").bind("change",function(e){
		readChoiceFile(e.target.files);
	});
	function readChoiceFile(files){
		if(!files.length){
			return;
		};
		
		Runtime.Log("发现"+files.length+"个文件，开始"+set.title+"...");
		
		var idx=-1;
		var run=function(){
			idx++;
			if(idx>=files.length){
				return;
			};
			
			var file = files[idx];
			var reader = new FileReader();
			reader.onload = function(e){
				set.process(file.name,e.target.result,files.length,idx,run);
			}
			reader.readAsArrayBuffer(file);
		};
		run();
	};
};


})();