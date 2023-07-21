document.addEventListener('UniAppJSBridgeReady', function () {
	uni.webView.getEnv(function (res) {
		console.log('当前环境：' + JSON.stringify(res))
		// onPlusReady()
		// var avaudiosession = plus.ios.import("AVAudioSession")
		// var avaudio = avaudiosession.sharedInstance()
		// avaudio.requestRecordPermission(() => {
		// 	console.log('回调完成')
		// })

	})

})

window.addEventListener("load", (event) => {
	console.log("page is fully loaded")
	if (navigator.userAgent.match(/iPad|iPhone/) && !window.location.href.match(/time=$/)) {
		// return window.location.replace(window.location.href + '?time=')
		console.log(window.location.href)
		// window.location.href = 'https://xiangyuecn.gitee.io/recorder/QuickStart.html'
	}

	// to set page
	$("#setting").click(() => {
		if (uni && uni.navigateTo) {
			uni.navigateTo({
				url: '../setting/setting',
			})
		}
	})

	var audio = document.querySelector(".audio")
	audio.addEventListener("durationchange", () => {
		console.log("change audio")
	})

	uni.createInnerAudioContext()

})

var recordSelf = null
var intervalTime = 2800
var RecordIntervalTimer = null
var requestlist = []
var playerSelf = null
var CallLinkSocket = null
var caller = null

const serverLink = "ws://35.89.119.204:8888/api/audio/ws"
function CallListen (param) {
	// websocket start
	/**
	 *  linking status - 1(btn & websocket start & open video)	
		 in call status - 2 (btn & circle & timer )
		 no call or hang up status - 2 (btn & circle & hidenTimer & websockt close  & close video)
	e**/
	this.name = param || "calllistener"
	this.status = 0   // 0 - no call  1-calling 
	this.palying = false
	this.beginTime = 0
	this.callTimeoutId = 0
	this.responeMsgList = []
	this.responeMsgPlay = function (msg) {
		if (this.playing) {
			responeMsgList.push(msg)
		} else {
			startPlay(msg)
		}
	}

	this.loopTalkMsg = function (data) {
		CallLinkSocket.send(data)
	}

}

/**  1. 处理按钮ui */
function handleUI (status = 0) {
	if (status == 1) {
		$('.chatbtn').addClass("hungup")
		$('.chatbtn').removeClass('linking')
		$('.chatbtn').css("animation", "none")
		caller.beginTime = Date.now()
		$('#calltimer').html("00:00:00")
		$('.callanimate-inner').addClass("calling")
		setCallTimeoutId() //通话时常
	} else if (status == -1) {
		handleToast()
		$('.chatbtn').removeClass('hungup')
		$('.chatbtn').css("animation", "none")
		$('.callanimate-inner').removeClass("calling")
		setCallTimeoutId(true) //结束通话时常
	} else {
		$('.chatbtn').removeClass('hungup')
		$('.callanimate-inner').removeClass("calling")
		setCallTimeoutId(true) //结束通话时常
		handleToast("通话已结束")
	}
}

/** 2.通话失败的错误提示～ */
function handleToast (param = '通话连接失败～请重试') {
	$('.chatfooter-tips').addClass('showfade')
	if (param) {
		$('#tips-text').html(param)
	}
	setTimeout(() => {
		$('.chatfooter-tips').removeClass('showfade')
		$('#tips-text').html('')
	}, 2500)
}

function setCallTimeoutId (param = false) {
	if (param) {
		clearInterval(caller.callTimeoutId)
		$('#calltimer').html("")
		return
	}
	caller.callTimeoutId = setTimeout(() => {
		var now = Date.now()
		var countTime = now - caller.beginTime
		var hh = parseInt(countTime / (60 * 60 * 1000))
		var mm = parseInt((countTime - hh * 60 * 60 * 1000) / (60 * 1000))
		var ss = parseInt((countTime - (hh * 60 + mm) * 60 * 1000) / 1000)
		$('#calltimer').html(numToTwo(hh) + ':' + numToTwo(mm) + ":" + numToTwo(ss))
		setCallTimeoutId()
	}, 1000)
}

function numToTwo (num) {
	return num > 9 ? num : '0' + num
}


// 扩展API加载完毕，现在可以正常调用扩展API 
function onPlusReady () {
	console.log('plus.audio')
	recordSelf = plus.audio.getRecorder()
	recordSelf.start()
}
// 
function startRecord () {
	if (recordSelf == null) {
		console.log("Device not ready!")
		recordSelf = plus.audio.getRecorder()
		// return false
	}
	recordSelf.record({ filename: "_doc/audio/" }, function (res) {
		console.log("Audio record success!")
		getRecoderDataWithBase64(res)
		requestlist.push(res)
	}, function (e) {
		console.log("Audio record failed: " + e.message)
	})
	stopRecord()
}

function stopRecord () {
	console.log("stopRecord")
	RecordIntervalTimer = setTimeout(() => {
		recordSelf.stop()
		startRecord()
	}, intervalTime)
}

function stopRecordForce () {
	console.log("stopRecordForce - fn")
	recordSelf.stop()
	clearTimeout(RecordIntervalTimer)
}

function startPlay (file) {
	if (plus.audio == undefined) {
		alert("Device not ready!")
	}
	playerSelf = plus.audio.createPlayer(file)
	caller.palying = true
	playerSelf.play(function () {
		console.log('play end~')
		caller.palying = false
		if (caller.responeMsgList.length != 0) {
			var _msg = caller.responeMsgList.shift()
			startPlay(_msg)
		}
	}, function (e) {
		console.log('play happens wrong')
		caller.palying = false
	})
}

function stopPlay () {
	playerSelf.stop()
	caller.palying = false
}

// 
function getRecoderDataWithBase64 (tempFilePath) {
	plus.io.resolveLocalFileSystemURL(tempFilePath, function (entry) {
		// 可通过entry对象操作test.html文件 
		entry.file(function (file) {
			var wav = new wavefile.WaveFile()
			console.log(wav)
			console.log("file")
			var fileReader = new plus.io.FileReader()

			fileReader.readAsDataURL(file)
			fileReader.onloadend = (evt) => {
				// alert("evt.target" + evt.target);
				// (evt.target.result)
				// caller.loopTalkMsg(evt.target.result)
				// console.log("getFile:" + JSON.stringify(evt.target.result))
				// CallLinkSocket(evt.target.result)
				wav.fromBase64(evt.target.result)
				// var wavBuffer = wav.toBuffer();
				console.log(wavBuffer)
				// vm.videoFile = evt.target.result
			}
			if (file.size > 0) {
				vm.recordlist.push(file.fullPath)
			}
			// vm.videoFile = file.name
			// vm.videoFile = file.size + '--' + file.name
			// console.log(file.size + '--' + file.name);
		})
	}, function (e) {
		console.log(e)
		alert("Resolve file URL failed: " + e.message)
	})
}