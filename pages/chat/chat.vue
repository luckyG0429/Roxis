<template>
	<view>
		<!-- 引入页面 -->
		<web-view src="https://chat-test.ursai.xyz/chat.html"></web-view>
	</view>
</template>

<script>
	import permision from "@/js_sdk/wa-permission/permission.js"
	export default {
		data() {
			return {
				
			}
		},
		mounted(){
			this.handlePermission()
		},
		methods:{
			 async handlePermission(){
				 let checkResult = false
				 const platform =  uni.getSystemInfoSync().platform
				 console.warn("checkResult", platform)
				 if(platform == 'ios') {
					 const checkRecordios = 'record'
					 checkResult =  permision.judgeIosPermission(checkRecordios)
				 }else {
					 const checkRecord = 'android.permission.RECORD_AUDIO';
					 checkResult = await permision.requestAndroidPermission(checkRecord)
				 }
				 if(!checkResult) {
					 permision.gotoAppPermissionSetting()
				 }
				 console.warn("checkResult", checkResult)
			 }
		 }
	}
</script>

<style>

</style>
