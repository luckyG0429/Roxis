/**
 * 
 *
 *
 * 采样率目前8000才可以听到
 * 
 * 调用方式
 * jsAudio = new JSAudio({
 *				wsCommand: {
 *					"cmd": "record",
 *					"sim": "040270639472",
 *					"channel": 0
 *				},
 *				audioParam： {
 *					sampleRate: 8000,
 *					sampleBit: 16,
 *					sampleChannel: 2
 *				}
 *				wsParam: {
 *					wsAddr: 'ws://192.168.1.73:9797',
 * 					// 间隔interval毫秒发送
 *					interval: 200,
 * 					// 是否实时发送
 * 					realTime: true
 *				}
 *			});
 *	开启监听并发送：
 *	jsAudio.startWs();
 *
 *	关闭发送
 *	jsAudio.closeWs();
 *
 *	其中audioParam和interval非必填 其他必填
 */

function JSAudio (args) {
	if (!checkBefore(args)) {
		return
	}
	var wsCommand = args.wsCommand
	var audioParam = args.audioParam ? args.audioParam : {
		sampleRate: 8000,
		sampleBit: 16,
		sampleChannel: 1
	}
	var wsAddr = args.wsParam.wsAddr
	var realTimeSend = args.wsParam.realTime
	var wsSendInterval = args.wsParam.interval
	var recorder = null
	var timeInte = null
	var audioContext
	// worker
	var worker;
	/**
	 * 初始化
	 */
	(function () {
		window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window
			.msAudioContext

		audioContext = new window.AudioContext()

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
		if (!navigator.getUserMedia) {
			alert('浏览器不支持音频输入')
			return
		}
		navigator.getUserMedia({
			"audio": true
		},
			function (stream) {
				console.log('开始')
				micto(stream) //具体工作
			},
			function (error) {
				if (error.indexOf('Permission denied') != -1) {
					// this.  禁用了麦克风监听
				}
				console.log(error)
			})
		let inlineWorker = function (func) {
			if (window.Worker) {
				var functionBody = func.toString().trim().match(
					/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/)[1]
				var url = window.URL.createObjectURL(new window.Blob([functionBody], {
					type: "text/javascript"
				}))
				return new window.Worker(url)
			}
		}
		worker = inlineWorker(function () {
			const OUTPUT_AUDIO_TYPE = {
				PCM: 'PCM',
				WAV: 'WAV'
			}
			// 录音 暂且不用
			let record = [],
				// 音频缓存
				// buffer: []
				sampleChannel,
				sampleBit,
				sampleRate,
				_self = this
			let init = function (option) {
				sampleChannel = option.sampleChannel
				sampleBit = option.sampleBit
				sampleRate = option.sampleRate
				oldSampleRate = option.oldSampleRate
				// console.log(option);
			}
			let recordData = function (buffer) {
				for (var i = 0; i < sampleChannel; i++) {
					if (!record[i]) {
						record[i] = []
					}
					record[i].push(buffer[i])
				}
			}
			let collect = function (type, realTimeData) {
				//					let recordClone = JSON.parse(JSON.stringify(record));
				let recordClone = realTimeData ? realTimeData : record
				if (recordClone == [] || !recordClone[0]) {
					return
				}
				// ***************************************************** TODO 看看有没有损耗
				if (sampleChannel == 1) { //单声道
					var collect_record = new Float32Array(4096 * recordClone[0].length)
					var offset = 0
					for (var i = 0; i < recordClone[0].length; i++) {

						collect_record.set(recordClone[0][i], offset)
						offset += recordClone[0][i].length
						// console.log(offset);
					}
					if (oldSampleRate / sampleRate != 1) { //压缩比
						var compress = oldSampleRate / sampleRate
						var compress_collect_record = new Float32Array(collect_record.length /
							compress)
						var index = 0,
							j = 0
						while (index < compress_collect_record.length) {
							compress_collect_record[index] = collect_record[j]
							j += compress
							index++
						}
					}
				} else if (sampleChannel == 2) { //双声道
					//处理声道1
					var collect_record_1 = new Float32Array(4096 * recordClone[0].length)
					var offset = 0
					for (var i = 0; i < recordClone[0].length; i++) {
						collect_record_1.set(recordClone[0][i], offset)
						offset += recordClone[0][i].length
					}
					if (oldSampleRate / sampleRate != 1) { //压缩声道1
						var compress = oldSampleRate / sampleRate
						var compress_collect_record_1 = new Float32Array(collect_record_1.length /
							compress)
						var index = 0,
							j = 0
						while (index < compress_collect_record_1.length) {
							compress_collect_record_1[index] = collect_record_1[j]
							j += compress
							index++
						}
					}
					//处理声道2
					var collect_record_2 = new Float32Array(4096 * recordClone[1].length)
					var offset = 0
					for (var i = 0; i < recordClone[1].length; i++) {
						collect_record_2.set(recordClone[1][i], offset)
						offset += recordClone[1][i].length
					}
					if (oldSampleRate / sampleRate != 1) { //压缩声道2
						var compress = oldSampleRate / sampleRate
						var compress_collect_record_2 = new Float32Array(collect_record_2.length /
							compress)
						var index = 0,
							j = 0
						while (index < compress_collect_record_2.length) {
							compress_collect_record_2[index] = collect_record_2[j]
							j += compress
							index++
						}
					}

					if (oldSampleRate / sampleRate == 1) { //双声道合成
						var collect_record = new Float32Array(collect_record_1.length + collect_record_2
							.length)
						for (var i = 0; i < collect_record_1.length + collect_record_2.length; i += 2) {
							collect_record[i] = collect_record_1[(i / 2) >> 0]
							collect_record[i + 1] = collect_record_2[(i / 2) >> 0]
						}
					} else { //双声道合成
						var compress_collect_record = new Float32Array(compress_collect_record_1
							.length + compress_collect_record_2.length)
						for (var i = 0; i < compress_collect_record_1.length + compress_collect_record_2
							.length; i += 2) {
							compress_collect_record[i] = compress_collect_record_1[(i / 2) >> 0]
							compress_collect_record[i + 1] = compress_collect_record_2[(i / 2) >> 0]
						}
					}

				}
				record = [] //清空
				var interleaveData = null
				const isOutPcm = type !== OUTPUT_AUDIO_TYPE.WAV
				if (oldSampleRate / sampleRate != 1) { //输入采集概和输出采集率不同，需要压缩采集点
					if (isOutPcm) {
						interleaveData = encodePcm(compress_collect_record)
					} else {
						interleaveData = encodeWave(compress_collect_record)
					}

				} else { // 常用
					console.log(collect_record)
					if (isOutPcm) {
						interleaveData = encodePcm(collect_record)
					} else {
						interleaveData = encodeWave(collect_record)
					}

				}
				var audioBlob
				if (isOutPcm) {
					audioBlob = new Blob([interleaveData])
					_self.postMessage({
						command: 'getPcmBlob',
						val: audioBlob
					})
					return audioBlob
				} else {
					audioBlob = new Blob([interleaveData], {
						type: 'audio/wav'
					})

					// record = []; //清空
					_self.postMessage({
						command: 'getWavBlob',
						val: audioBlob
					})
					return audioBlob
				}

			}
			/*
			 * 二进制
			 */
			function getBlob () {
				return collect(OUTPUT_AUDIO_TYPE.PCM)
			}

			function floatTo16BitPCM (output, offset, input) {
				for (var i = 0; i < input.length; i++, offset += 2) {
					var s = Math.max(-1, Math.min(1, input[i]))
					output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
				}
			}

			function floatTo8BitPCM (output, offset, input) {
				for (var i = 0; i < input.length; i++, offset++) { //这里只能加1了
					var s = Math.max(-1, Math.min(1, input[i]))
					var val = s < 0 ? s * 0x80 : s * 0x7F
					val += 128
					output.setInt8(offset, val)
				}
			}

			function writeString (view, offset, string) {
				for (var i = 0; i < string.length; i++) {
					view.setUint8(offset + i, string.charCodeAt(i))
				}
			}

			let encodeWave = function (samples) {
				if (sampleBit == 8) {
					var dataLength = samples.length

				} else if (sampleBit == 16) { //16位的需要两倍空间
					var dataLength = samples.length
					dataLength = dataLength * 2
				}

				var buffer = new ArrayBuffer(dataLength + 44)
				var view = new DataView(buffer)
				var newSamepleRate = sampleRate
				var newSampleBits = sampleBit
				var newSampleChannel = sampleChannel
				// 
				writeString(view, 0, 'RIFF')
				view.setUint32(4, 36 + dataLength, true)
				writeString(view, 8, 'WAVE')
				writeString(view, 12, 'fmt ')
				view.setUint32(16, 16, true)
				view.setUint16(20, 1, true) // 线性PCM编码
				view.setUint16(22, newSampleChannel, true) //通道数
				view.setUint32(24, newSamepleRate, true) // 采样率
				view.setUint32(28, newSamepleRate * newSampleChannel * (newSampleBits / 8),
					true) // 表示波形数据传输速率（每秒平均字节数），大小为 采样率 * 通道数 * 采样位数
				view.setUint16(32, newSampleChannel * (newSampleBits / 8), true)
				view.setUint16(34, newSampleBits, true)
				writeString(view, 36, 'data')
				view.setUint32(40, dataLength, true)
				// 
				if (sampleBit == 8) {
					floatTo8BitPCM(view, 44, samples)
				} else if (sampleBit == 16) {
					floatTo16BitPCM(view, 44, samples)
				}

				return view
			}
			let encodePcm = function (samples) {
				var dataLength
				if (sampleBit == 8) {
					dataLength = samples.length

				} else if (sampleBit == 16) { //16位的需要两倍空间
					dataLength = samples.length * 2
				}

				var buffer = new ArrayBuffer(dataLength)
				var view = new DataView(buffer)
				if (sampleBit == 8) {
					floatTo8BitPCM(view, 0, samples)
				} else if (sampleBit == 16) {
					floatTo16BitPCM(view, 0, samples)
				}

				return view
			}
			this.onmessage = function (e) {

				switch (e.data.command) {

					case 'init':
						init(e.data.val)
						break
					case 'record':
						recordData(e.data.val)
						break
					case 'collect':
						collect()
						break
					case 'collectReal':
						collect(OUTPUT_AUDIO_TYPE.PCM, [e.data.val])
						break
					case 'getBlob':
						getBlob()
						break
				}
			}
		})

	})()
	var micto = function (stream) {

		window.source = audioContext.createMediaStreamSource(stream)

	}
	var start = function () { //开始
		if (window.interval) {
			return false
		}
		window.oldSampleRate = audioContext.sampleRate
		window.sampleRate = audioParam.sampleRate
		window.sampleBit = audioParam.sampleBit
		window.sampleChannel = audioParam.sampleChannel

		// console.log(window.sampleRate, window.sampleBit, window.sampleChannel);
		worker.postMessage({
			command: 'init',
			val: {
				sampleRate: window.sampleRate,
				sampleBit: window.sampleBit,
				sampleChannel: window.sampleChannel,
				oldSampleRate: window.oldSampleRate
			}
		})
		//window.node = (audioContext.createScriptProcessor || audioContext.createJavaScriptNode).call(audioContext, 4096, window.sampleChannel, window.sampleChannel);
		recorder = (audioContext.createScriptProcessor || audioContext.createJavaScriptNode).call(audioContext,
			4096, window.sampleChannel, window.sampleChannel)
		recorder.onaudioprocess = function (e) {
			var buffer = []
			for (var i = 0; i < window.sampleChannel; i++) {
				buffer.push(e.inputBuffer.getChannelData(i))
			}
			if (realTimeSend) {
				// 启用实时发送
				worker.postMessage({
					command: 'collectReal',
					val: buffer
				})
			} else {
				worker.postMessage({
					command: 'record',
					val: buffer
				})
			}

		}
		reConnect()

	}
	var reConnect = function () {
		//				window.source.connect(window.node);
		//				window.node.connect(audioContext.destination);
		window.source.connect(recorder)
		recorder.connect(audioContext.destination)
	}
	var stop = function () { //结束
		worker.postMessage({
			command: 'collect'
		})
		window.source.disconnect(recorder)
		recorder.disconnect(audioContext.destination)
		clearInterval(window.interval)
		window.interval = null
		console.log('ws 停止成功！')
	}
	var getBlob = function () {
		worker.postMessage({
			command: 'getBlob'
		})
	}
	worker.onmessage = function (e) {
		console.log('发送的音频流', e.data)
		if (!checkWsIsOpen()) {
			return
		}
		switch (e.data.command) {
			case 'getPcmBlob':
				ws.send(e.data.val)
			case 'getWavBlob':
				// ws.send(e.data.val);
				break
		}
	}

	//播放声音
	function playSound (buffer) {
		var source = audioContext.createBufferSource() // 创建一个声音源
		source.buffer = buffer // 告诉该源播放何物
		source.connect(audioContext.destination) //将该源与硬件相连
		source.start(0) // 开始播放
	}

	function checkBefore (args) {
		if (!args.wsCommand) {
			console.error('webSocket命令必填')
			return false
		}
		if (!args.wsParam.wsAddr) {
			console.error('webSocket地址必填')
			return false
		}
		return true
	}

	this.startWs = function () {
		console.log('开始对讲')
		// ws = new WebSocket(wsAddr);
		// ws.onopen = function() {
		// 	console.log('握手成功');
		// 	// 业务命令 创建http连接时传递到服务端
		// 	//			var data = {
		// 	//				"cmd": "record",
		// 	//				"sim": "040270639472",
		// 	//				"channel": 0
		// 	//			}
		// 	ws.send(JSON.stringify(wsCommand));
		// };
		// ws.onmessage = function(e) {
		// 	console.log('返回的消息' + e);
		// 	console.log(e.data)
		// 	// console.dir(e.data)
		// 	// let file = e.data[0].Blob
		// 	var reader = new FileReader(); //文件阅读器
		// 	reader.readAsArrayBuffer(e.data); //读取成ArrayBuffer对象
		// 	reader.onload = function() { //读取完毕
		// 		//解码
		// 		// var context = new(window.AudioContext || window.webkitAudioContext)();
		// 		audioContext.decodeAudioData(this.result, function(buffer) {
		// 			playSound(buffer);
		// 		}, function(e) {
		// 			"Error with decoding audio data" + e.err
		// 		});
		// 	}
		// 	// receive(e.data);
		// };
		// ws.onerror = function(e) {
		// 	console.log(error);
		// }
		// audioContext.resume().then(function() { // GOOGLE 
		// 	console.log('Playback resumed successfully');
		// });
		start()
		// reConnect();
		// 未启用实时发送 则取消定时发送逻辑
		if (!realTimeSend) {
			timeInte = setInterval(function () {
				if (!checkWsIsOpen()) {
					return
				}
				getBlob()
			}, wsSendInterval)
		}
	}

	function checkWsIsOpen () {
		if (ws.readyState !== 1) {
			return false
		}
		return true
	}
	/**
	 *end talk
	 */
	this.closeWs = function () {
		console.log('关闭对讲')
		if (ws) {
			ws.close()
			stop()
			clearInterval(timeInte)
		}
	}

}
