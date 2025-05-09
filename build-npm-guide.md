# Vant Weapp组件构建指南

项目清理后，需要重新构建npm依赖以使Vant组件正常工作。请按照以下步骤操作：

## 步骤1: 打开微信开发者工具

使用微信开发者工具打开本项目。

## 步骤2: 确认npm模块设置

1. 点击工具栏的**详情**按钮
2. 在"本地设置"面板中，确保勾选了**使用npm模块**选项
3. 如果没有勾选，请勾选后点击"确定"

## 步骤3: 构建npm

1. 点击微信开发者工具顶部菜单的**工具** -> **构建npm**
2. 在弹出的对话框中点击"构建npm"
3. 等待构建完成（这可能需要几分钟时间）

## 步骤4: 恢复组件引用

构建完成后，miniprogram_npm目录会自动创建。此时，您可以：

1. 编辑`app.json`文件，恢复全局组件注册：
```json
"usingComponents": {
  "van-icon": "@vant/weapp/icon/index",
  "admin-tab-bar": "/components/admin-tab-bar/admin-tab-bar"
}
```

2. 编辑`pages/profile/profile.json`和`pages/order-detail/order-detail.json`恢复组件引用：
```json
"usingComponents": {
  "van-icon": "@vant/weapp/icon/index"
}
```

## 步骤5: 刷新项目

构建和恢复组件引用后，点击微信开发者工具中的**编译**按钮重新编译项目。

## 常见问题

如果仍然出现组件未找到的错误，请尝试以下方法：

1. 在组件路径前添加`/miniprogram_npm/`前缀：
```json
"van-icon": "/miniprogram_npm/@vant/weapp/icon/index"
```

2. 检查`node_modules`目录是否存在以及是否包含`@vant/weapp`
3. 如果不存在，执行`npm install`命令安装依赖
4. 重新执行构建npm步骤 