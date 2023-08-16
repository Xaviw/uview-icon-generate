# @xavi/uicon

uniapp + UView 项目中快速生成自定义字体图标组件工具

## 使用方式

1. 在[iconfont.cn](https://www.iconfont.cn/)中添加需要的图标至购物车

2. 点击购物车，将图标添加至项目

3. 批量操作图标-批量去色（可以跳过）

4. 项目设置-修改 `FontClass/Symbol前缀` 和 `Font Family`（可以跳过）

5. 查看在线链接或下载至本地

6. 项目根目录中运行 `npx @xavi/uicon` 并按提示操作

## 说明

脚本根据传入的`组件创建路径`（默认`./components/CustomIcon`）生成 CustomIcon 组件，内部包括 `CustomIcon.vue`、 `props.js`、 `icons.js`三个文件

仅支持传入`ttf`格式的本地或网络字体文件地址

支持选择以网络地址方式链接还是以 Base64 格式内嵌，默认以网络地址方式链接

会按照 `uni_modules/uview` 、 `node_modules/uview` 、 `网络地址` 的顺序依次查找 u-icon 源码，如果项目中 uview 源码未保存在 uni_modules 或 node_modules 中还需要修改生成的 vue 代码中 `components.scss` 引入路径

## 原理

UView 官方因未实现 nvue 文件扩展字体图标，暂未推出 u-icon 组件扩展图标功能（该组件发布时uview版本号：2.0.36）

但是项目使用中可以直接复制 u-icon 组件，修改 iconfont 字体图标链接以及相关属性，以自定义组件方式实现扩展图标

手动实现复制组件较为麻烦（需要手动录入图标名与 unicode 的对应关系等），使用该工具即可快速生成
