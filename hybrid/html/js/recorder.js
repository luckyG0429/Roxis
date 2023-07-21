

var testOutputWavLog = false//本测试如果不是输出wav格式，就顺带打一份wav的log，录音后执行mp3、wav合并的demo代码可对比音质
var testSampleRate = 16000
var testBitRate = 16

var RealTimeSendTryReset = function (type) {
	realTimeSendTryType = type
	realTimeSendTryTime = 0
}

var realTimeSendTryType
var realTimeSendTryEncBusy
var realTimeSendTryTime = 0
var realTimeSendTryNumber
var transferUploadNumberMax
var realTimeSendTryChunk
var SendInterval = 5000
var audioSocket = null

//  if(navigator.userAgent.match(/iPad|iPhone/) && !window.location.href.match(/\&index=$/)) {
// 		  // window.location.replace(window.location.href + '&index=');
// 		  console.log("ios")
// }

//=====实时处理核心函数==========
var RealTimeSendTry = function (buffers, bufferSampleRate, isClose) {
	var t1 = Date.now()
	if (realTimeSendTryTime == 0) {
		realTimeSendTryTime = t1
		realTimeSendTryEncBusy = 0
		realTimeSendTryNumber = 0
		transferUploadNumberMax = 0
		realTimeSendTryChunk = null
	};
	if (!isClose && t1 - realTimeSendTryTime < SendInterval) {
		return//控制缓冲达到指定间隔才进行传输
	};
	realTimeSendTryTime = t1
	var number = ++realTimeSendTryNumber

	var pcm = [], pcmSampleRate = 0
	if (buffers.length > 0) {
		//借用SampleData函数进行数据的连续处理，采样率转换是顺带的，得到新的pcm数据
		var chunk = Recorder.SampleData(buffers, bufferSampleRate, testSampleRate, realTimeSendTryChunk, { frameType: isClose ? "" : realTimeSendTryType })

		//清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
		for (var i = realTimeSendTryChunk ? realTimeSendTryChunk.index : 0; i < chunk.index; i++) {
			buffers[i] = null
		};
		realTimeSendTryChunk = chunk//此时的chunk.data就是原始的音频16位pcm数据（小端LE），直接保存即为16位pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件

		pcm = chunk.data
		pcmSampleRate = chunk.sampleRate
	};

	//没有新数据，或结束时的数据量太小，不能进行mock转码
	if (pcm.length == 0 || isClose && pcm.length < 2000) {
		TransferUpload(number, null, 0, null, isClose)
		return
	};

	//实时编码队列阻塞处理
	if (!isClose) {
		if (realTimeSendTryEncBusy >= 2) {
			Runtime.Log("编码队列阻塞，已丢弃一帧", 1)
			return
		};
	};
	realTimeSendTryEncBusy++

	//通过mock方法实时转码成mp3、wav；16位pcm格式可以不经过此操作，直接发送new Blob([pcm.buffer],{type:"audio/pcm"}) 要8位的就必须转码
	var encStartTime = Date.now()
	var recMock = Recorder({
		type: realTimeSendTryType
		, sampleRate: testSampleRate //采样率
		, bitRate: testBitRate //比特率
	})
	recMock.mock(pcm, pcmSampleRate)
	recMock.stop(function (blob, duration) {
		realTimeSendTryEncBusy && (realTimeSendTryEncBusy--)
		blob.encTime = Date.now() - encStartTime
		//转码好就推入传输
		TransferUpload(number, blob, duration, recMock, isClose)
	}, function (msg) {
		realTimeSendTryEncBusy && (realTimeSendTryEncBusy--)
		//转码错误？没想到什么时候会产生错误！
		Runtime.Log("不应该出现的错误:" + msg, 1)
	})

	if (testOutputWavLog && realTimeSendTryType != "wav") {
		//测试输出一份wav，方便对比数据
		var recMock2 = Recorder({
			type: "wav"
			, sampleRate: testSampleRate
			, bitRate: 16
		})
		recMock2.mock(pcm, pcmSampleRate)
		recMock2.stop(function (blob, duration) {
			var logMsg = "No." + (number < 100 ? ("000" + number).substr(-3) : number)
			Runtime.LogAudio(blob, duration, recMock2, logMsg)
		})
	};

}

//=====数据传输函数==========
var TransferUpload = function (number, blobOrNull, duration, blobRec, isClose) {
	transferUploadNumberMax = Math.max(transferUploadNumberMax, number)
	if (blobOrNull) {
		var blob = blobOrNull
		var encTime = blob.encTime

		//*********发送方式一：Base64文本发送***************
		// var reader = new FileReader()
		// reader.onloadend = function () {
		// 	var base64 = (/.+;\s*base64\s*,\s*(.+)$/i.exec(reader.result) || [])[1]
		// 	console.log(base64)
		// 	//可以实现
		// 	//WebSocket send(base64) ...
		// 	//WebRTC send(base64) ...
		// 	//XMLHttpRequest send(base64) ...

		// 	//这里啥也不干
		// }
		// reader.readAsDataURL(blob)

		//*********发送方式二：Blob二进制发送***************
		//可以实现
		//WebSocket send(blob) ...
		//WebRTC send(blob) ...
		//XMLHttpRequest send(blob) ...
		const fileMaxSize = 1024 * 2
		if (blob.size > fileMaxSize) {
			const countAll = Math.ceil(blob.size / fileMaxSize)
			audioSocket.send("[START-RECORD]")
			for (let i = 0; i < countAll; i++) {
				var start = i * fileMaxSize
				var end = start + fileMaxSize
				if (end > blob.size) {
					end = blob.size
				}
				let newBlob = blob.slice(start, end)
				// console.log(audioSocket.readyState)
				audioSocket.send(newBlob)
			}

		}
		//****这里仅 console.log一下 意思意思****
		var numberFail = number < transferUploadNumberMax ? '<span style="color:red">顺序错乱的数据，如果要求不高可以直接丢弃，或者调大SendInterval试试</span>' : ""
		var logMsg = "No." + (number < 100 ? ("000" + number).substr(-3) : number) + numberFail

		Runtime.LogAudio(blob, duration, blobRec, logMsg + "花" + ("___" + encTime).substr(-3) + "ms")

		if (true && number % 100 == 0) {//emmm....
			Runtime.LogClear()
		};
	};

	if (isClose) {
		audioSocket.send("[END-RECORD]")
		Runtime.Log("No." + (number < 100 ? ("000" + number).substr(-3) : number) + ":已停止传输")
	};
}



//=====以下代码无关紧要，音频数据源，采集原始音频用的==================
//加载框架
let = './js'
Runtime.Import([
	{ url: RootFolder + "/recorder-core.js", check: function () { return !window.Recorder } }
	, { url: RootFolder + "/wav.js", check: function () { return !Recorder.prototype.wav } }
	, { url: RootFolder + "/pcm.js", check: function () { return !Recorder.prototype.pcm } }
])

//控制按钮事件
var startStatus = 0
var responseList = []
$("#intercomBegin").click(function () {
	if (startStatus == 1) {
		startStatus = 0
		// stopRecordForce()
		return recStop()
	}
	startStatus = 1
	if (!caller) {
		caller = new CallListen()
	}
	$('.chatbtn').addClass("linking")
	const socketlink = "wss://chat-test.ursai.xyz/roxie/api/audio/ws"
	audioSocket = new WebSocket(socketlink)
	audioSocket.onopen = function () {
		console.log('WebSocket link is ok')
		console.log("reayState", audioSocket.readyState)
		handleUI(1)
		startStatus = 1
		return recStartWav()
	}

	audioSocket.onmessage = (event) => {
		console.log("onmessage")
		console.log(event.data)
		// recPause()
		if (event.data == '[START-TTS]') {
			if (rec && Recorder.IsOpen()) {
				recPause()
			}
		} else if (event.data == '[END-TTS]') {
			handlePlay(true)
		} else {
			responseList.push(event.data)
		}
	}
	audioSocket.onclose = (event) => {
		console.log("onclose")
		console.log(event)
		recStop()
		handleUI()
	}

	audioSocket.onerror = (event) => {
		console.log("maybe wrongs")
		console.log(event)
		handleUI(-1)
		recStop()
	}

})

var audioPlayStatus = false
/**处理接受回来的音频数据 - 1.暂停录音 2.播放音频  3.播放结束 4. 继续录音*/
function handlePlay () {
	// 处理数据
	if (audioPlayStatus) return false
	if (!!responseList.length) {
		const aduioFile = responseList.shift()
		recPlay(aduioFile)
	} else {
		recResume()
	}
}

/**暂停录音**/
function recPause () {
	if (rec && Recorder.IsOpen()) {
		rec.pause()
	} else {
		reclog("未打开录音", 1)
	};
};
/**恢复录音**/
function recResume () {
	if (rec && Recorder.IsOpen()) {
		rec.resume()
	} else {
		reclog("未打开录音", 1)
	};
};


function recPlay (recBlob) {
	if (!recBlob) {
		reclog("请先录音，然后停止后再播放", 1)
		return
	};
	audioPlayStatus = true
	// var audio = document.querySelector(".audio")
	//简单利用URL生成播放地址，注意不用了时需要revokeObjectURL，否则霸占内存
	// audio.autoplay = true
	// audio.src = (window.URL || webkitURL).createObjectURL(recBlob)
	var baseurl = ''
	const fs = new FileReader()
	fs.readAsDataURL(recBlob)
	fs.onload = () => {
		baseurl = fs.result
		console.log('fs.onload ')
		// console.log(baseurl)
		const sound = new Howl({
			src: [baseurl],
			format: ['mp3'],
			autoplay: true,
		})

		// Play the sound.
		sound.on('load', function () {
			sound.play()
		})
		// 
		sound.on('end', function () {
			console.log('Finished!')
			audioPlayStatus = false
			handlePlay(true)
		})
		sound.on('loaderror', function (e) {
			console.log('load error!')
			console.log(e)
		})
	}
	fs.onerror = (e) => {
		console.log('fs.onerror ')
		console.log(e)
	}

	// const baseurl = (window.URL || webkitURL).createObjectURL(recBlob)
	// console.log(recBlob)

	// audio.oncanplaythrough = (event) => {
	// 	console.log('I think I can play through the entire ' +
	// 		'video without ever having to stop to buffer.')
	// 	audio.play()
	// }
	// audio.play().then(() => {
	// 	console.log('okok')
	// }).catch(e => {
	// 	console.log("need click")
	// })
	// audio.addEventListener('ended', function () {
	// 	//  播放下一条
	// 	console.log("end");
	// 	(window.URL || webkitURL).revokeObjectURL(audio.src)
	// 	audioPlayStatus = false
	// 	handlePlay(true)
	// }, false)
	// setTimeout(function () {
	// 	(window.URL || webkitURL).revokeObjectURL(audio.src)
	// }, 5000)
};

//调用录音
var rec
function recStartMp3 () {
	recStart("mp3")
};
function recStartWav () {
	recStart("wav")
};
function recStartPcm () {
	recStart("pcm")
};
function recStart (type) {
	if (rec) {
		rec.close()
	};
	rec = Recorder({
		type: "unknown"
		, onProcess: function (buffers, powerLevel, bufferDuration, bufferSampleRate) {
			// Runtime.Process.apply(null, arguments)
			// console.log(buffers)
			//推入实时处理，因为是unknown格式，buffers和rec.buffers是完全相同的（此时采样率为浏览器采集音频的原始采样率），只需清理buffers就能释放内存，其他格式不一定有此特性。
			RealTimeSendTry(buffers, bufferSampleRate, false)
		}
	})

	var t = setTimeout(function () {
		Runtime.Log("无法录音：权限请求被忽略（超时假装手动点击了确认对话框）", 1)
	}, 8000)

	rec.open(function () {//打开麦克风授权获得相关资源
		clearTimeout(t)
		rec.start()//开始录音
		RealTimeSendTryReset(type)//重置环境，开始录音时必须调用一次
	}, function (msg, isUserNotAllow) {
		clearTimeout(t)
		Runtime.Log((isUserNotAllow ? "UserNotAllow，" : "") + "无法录音:" + msg, 1)
	})
};

function recStop () {
	rec.close()//直接close掉即可，这个例子不需要获得最终的音频文件
	RealTimeSendTry([], 0, true)//最后一次发送
	audioSocket.close()
	handleUI(0)
};


/**调用RequestPermission打开录音请求好录音权限**/
var recReq = function () {//一般在显示出录音按钮或相关的录音界面时进行此方法调用，后面用户点击开始录音时就能畅通无阻了
	console.log("2")
	rec = false
	reclog("正在打开录音，请稍后...")

	// rec=true;
	// recStart('wav')
	// createDelayDialog(); //我们可以选择性的弹一个对话框：为了防止移动端浏览器存在第三种情况：用户忽略，并且（或者国产系统UC系）浏览器没有任何回调，此处demo省略了弹窗的代码
	// RecordApp.RequestPermission(function(){
	// 	rec=true;
	// 	dialogCancel(); //如果开启了弹框，此处需要取消

	// 	reclog("已打开录音，可以点击录制开始录音了",2);
	// },function(err,isUserNotAllow){
	// 	dialogCancel(); //如果开启了弹框，此处需要取消
	// 	reclog((isUserNotAllow?"UserNotAllow，":"")+"打开录音失败："+err,1);
	// });

	// window.waitDialogClick=function(){
	// 	dialogCancel();
	// 	reclog("打开失败：权限请求被忽略，<span style='color:#f00'>用户主动点击的弹窗</span>",1);
	// };
}

var reclog = function (param) {
	console.warn(param)
}


