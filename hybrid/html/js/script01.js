
(function () {
	var WaveViewBak = Recorder.WaveView
	var WaveSurferViewBak = Recorder.WaveSurferView
	var LibFFTBak = Recorder.LibFFT
	var FrequencyHistogramViewBak = Recorder.FrequencyHistogramView
	var LogAudios = [0]

	window.NOOP = function () { }
	window.RootFolder = ".."
	window.Runtime = {
		LogAudios: LogAudios,

		Import: function (jsList, win) {
			win = win || window
			var doc = win.document
			var load = function (idx) {
				if (idx >= jsList.length) {
					Runtime.CodeRunClick(1)
					return
				};
				var itm = jsList[idx]
				var url = itm.url
				if (itm.check() === false) {
					load(idx + 1)
					return
				};

				var elem = doc.createElement("script")
				elem.setAttribute("type", "text/javascript")
				elem.setAttribute("src", url)
				elem.onload = function () {
					load(idx + 1)
				}
				elem.onerror = function (e) {
					Runtime.Log("请求失败:" + (e.message || "-") + "，" + url, 1)
				}
				doc.body.appendChild(elem)
			}
			setTimeout(function () {
				load(0)
			})

			Runtime.CodeRunImport()
		}

		, Process: function (buffers, powerLevel, bufferDuration, bufferSampleRate) {
			Recorder.WaveView = WaveViewBak
			Recorder.WaveSurferView = WaveSurferViewBak
			Recorder.LibFFT = LibFFTBak
			Recorder.FrequencyHistogramView = FrequencyHistogramViewBak
			var waveStore = Runtime.WaveStore
			return false
		}

		, ReadBlob: function (blob, call) {
			var reader = new FileReader()
			reader.onloadend = function (e) {
				call(reader.result)
			}
			reader.readAsArrayBuffer(blob)
		}
		, DecodeAudio: function (fileName, arrayBuffer, True, False) {
			True = True || NOOP
			False = False || NOOP
			if (!Recorder.GetContext()) {//强制激活Recorder.Ctx 不支持大概率也不支持解码
				False("浏览器不支持音频解码")
				return
			};
			var type = (/[^.]+$/.exec(fileName) || [])[0] || ""
			var srcBlob = new Blob([arrayBuffer], { type: type && ("audio/" + type) || "" })

			var ctx = Recorder.Ctx
			ctx.decodeAudioData(arrayBuffer, function (raw) {
				var src = raw.getChannelData(0)
				var sampleRate = raw.sampleRate
				console.log(fileName, raw, srcBlob)

				var pcm = new Int16Array(src.length)
				for (var i = 0; i < src.length; i++) {//floatTo16BitPCM 
					var s = Math.max(-1, Math.min(1, src[i]))
					s = s < 0 ? s * 0x8000 : s * 0x7FFF
					pcm[i] = s
				};

				True({
					sampleRate: sampleRate
					, duration: Math.round(src.length / sampleRate * 1000)
					, srcBlob: srcBlob
					, type: type
					, data: pcm
				})
			}, function (e) {
				console.error("audio解码失败", e)
				False(fileName + "解码失败:" + (e && e.message || "-"))
			})
		}

		/*显示日志内容，color:0默认，1红色，2绿色，其他指定颜色*/
		, Log: function (msg, color) {
			var now = new Date()
			var t = ("0" + now.getHours()).substr(-2)
				+ ":" + ("0" + now.getMinutes()).substr(-2)
				+ ":" + ("0" + now.getSeconds()).substr(-2)
			var html = '<div style="color:' + (!color ? "" : color == 1 ? "red" : color == 2 ? "#0b1" : color) + '">[' + t + ']' + msg + '</div>'
			$(".mainLog").prepend(html)
			$(".mainLastLog").html(html.replace(/class\s*=/ig, "clazz="))
		}
		, LogAudio: function (blob, duration, rec, msg) {
			var set = rec && rec.set || {}
			var id = LogAudios.length
			LogAudios.push({ blob: blob, set: $.extend({}, set), duration: duration })

			Runtime.Log((msg || "已录制") + ":" + (set.bitRate || "-") + "kbps " + (set.sampleRate || "-") + "hz " + blob.size + "b [" + (set.type || "-") + "]" + formatMs(duration || 0) + 'ms <button onclick="Runtime.LogAudioDown(\'' + id + '\')">下载</button> <button onclick="Runtime.LogAudioPlay(\'' + id + '\')">播放</button> <span class="p' + id + '"></span> <span class="LogAudio_' + id + '"></span>')
		}
		, LogClear: function () {
			$(".mainLog").html("")
			$(".mainLastLog").html("")
			LogAudios.length = 1
		}
	}
	var formatMs = function (ms, all) {
		var f = Math.floor(ms / 60000), m = Math.floor(ms / 1000) % 60
		var s = (all || f > 0 ? (f < 10 ? "0" : "") + f + ":" : "")
			+ (all || f > 0 || m > 0 ? ("0" + m).substr(-2) + "″" : "")
			+ ("00" + ms % 1000).substr(-3)
		return s
	}


	var recwaveChoiceKey = localStorage["RecWaveChoiceKey"] || "WaveView"
	$(".recwaveChoice").bind("click", function (e) {
		var elem = $(e.target)
		$(".recwaveChoice").removeClass("slc")
		var val = elem.addClass("slc").attr("key")

		recwaveChoiceKey = val
		localStorage["RecWaveChoiceKey"] = recwaveChoiceKey
	})
	if (!$(".recwaveChoice[key=" + recwaveChoiceKey + "]").length) {
		recwaveChoiceKey = "WaveView"
	};
	$(".recwaveChoice[key=" + recwaveChoiceKey + "]").click()


	$(window).bind("error", function (e) {
		Runtime.Log('【Error】:<pre>' + (e.error ? e.error.stack : event.message) + '</pre>', 1)
	})
})()
