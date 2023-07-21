# uniapp 混合项目

网页版可以直接访问使用
目前测试环境链接： https://chat-test.ursai.xyz/chat.html

# uniapp + hybrid 方案， 使用了 Recorder 库 + howler 库

这里用到了一些外部的 js，已实现该功能，具体的实现方案：

结论：✅ 实时录音，流数据上传； ✅ 在移动端实现自动播放音频

- 使用 Recorder 库 ： 做到了音频实时录制以及流文件分批上传 ，❌ 返回的音频数据无法自动播放。（仅在 pc 端的浏览器可以自动播放；移动端里 Android 版的微信内，时而能播放，时而不能。ios 内所有都不能自动播放音频。 ）

- howler 库：移动端的自动播放工具包

# 如何让代码运行【方法一： APP 模拟器】

1.  需要开发调试工具 - HbuilderX
2.  下载 XCode,使用 ios 模拟器
3.  HbuilderX 中选择 IOS 模拟器版本，开始运行。

# 如何让代码运行 【方法二： 网页版运行】

1. 需要开发工具 - vscode (visual studio code 的简称)
2. 工具内安装插件 - live server
3. 直接选择目录 hybrid->html->chat（实时语音项目的核心代码）
4. 选择 go live， 本地开发预览
