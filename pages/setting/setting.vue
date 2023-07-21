<template>
	<view class="setting-page">
		<view class="top-bg">
			<text class="page-title">Setting</text>
			<image  class="page-back" src="/static/image/icon-back.svg" @click="handleBack"></image>
		</view>
		<view class="uni-line">
			<view class="uni-title">Join our community</view>
			<view class="uni-lines-item" @click="handleDiscor">
				<image class="uni-lines-item-img" src="/static/image/discord.svg"></image>
				<text class="uni-lines-item-text">Discord</text>
			</view>
			<view class="uni-lines-item"  @click="handleTiweer">
				<image class="uni-lines-item-img" src="/static/image/tiwwer.svg"></image>
				<text class="uni-lines-item-text">Twitter</text>
			</view>
		</view>
		<view class="uni-line">
			<view  class="uni-title">Account</view>
				<view class="uni-lines-item">
					<text class="uni-lines-item-text light-color">UID:</text><text class="uni-lines-item-text">{{uuid}}</text>
				</view>
				<view class="uni-lines-item">
					<text class="uni-lines-item-text">Unlimited credit for now</text>
				</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: "setting",
		data(){
			return {
				uuid: "8881233211881"
			}
		},
		methods: {
			handleTiweer(){
				const link = "https://twitter.com/URS__ai";
				this.handleOpenApp('twitter', link, (res)=>{
					console.log("twitter app is not exist")
				});
			},
			handleDiscor(){
				const link = "https://discord.gg/kDF9EU4Ygp";
				this.handleOpenApp('discord', link, (res)=>{
					console.log("twitter app is not exist")
				});
			},
			handleBack(){
				uni.navigateBack({})
			},
			handleOpenApp(app, url, errfn){
				const appInf = {
					pname: app,
					action: app
				}
				if(plus?.runtime?.isApplicationExist(appInf)){
					plus.runtime.openURL( url, errfn );
				}else{
					// console.log("handleOpenApp error")
				   plus.runtime.openURL( url, errfn );
				}
			},
		}
	}
</script>

<style lang="scss">
	.setting-page{
		background-image: url("@/static/image/bg.svg");
		background-size: 375px;
		background-position: 0 0;
		background-repeat: no-repeat;
		width: 100%;
		padding-top: 42px;
		height: 100vh;
	
	}
	.top-bg{
		display: block;
		height: 44px;
		line-height:44px;
		display: flex;
		justify-content: center;
		position: relative;
		align-items: center;
	}
	.page-title{
		font-size: 40rpx;
		font-weight: 600;
	}
	.page-back{
		position: absolute;
		left: 10px;
		top:10px;
		width: 24px;
		height: 24px;
		display: inline-block;
	}
	.uni-title{
		color: #999;
		font-size: 14px;
		margin-bottom: 15px;
	}
	.uni-line{
		padding: 10px 15px;
		color: #333;
		border-bottom: 2rpx solid rgba(200,200,200,0.2);
	}
	.uni-lines-item{
		color: #333;
        padding: 20px 10px ;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		&-img{
			height: 24px;
			width: 24px;
			display: inline-block;
			margin-right: 8px;
		}
		  &-text{
			  font-size: 16px;
			  font-weight: 600;
			  line-height: 20px;
			  letter-spacing: 0px;
			  text-align: left;
		  }
		  .light-color{
			  opacity: 0.5;
			  margin-left: 2px;
		  }
	}
</style>