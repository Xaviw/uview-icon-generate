# @xavi/uicon

`uniapp(HBuilder)` + `UView 2.0` 项目中快速生成自定义字体图标组件工具

## 使用方式

1. 在[iconfont.cn](https://www.iconfont.cn/)中添加需要的图标至购物车

2. 点击购物车，将图标添加至项目

3. 批量操作图标-批量去色（可以省略）

4. 项目设置-修改 `FontClass/Symbol前缀` 和 `Font Family`（可以省略）

5. 查看在线链接或下载至本地

6. 项目根目录中运行 `npx @xavi/uicon` 并按提示操作

## 说明

只能用于`Hbuilder`创建的项目（CLI项目可以修改源码实现），需要在项目根目录中运行，且`uview`安装位置为`@/uni_modules/uview`

支持传入`ttf`、`woff`、`woff2`格式的本地或网络文件地址

支持选择以网络地址方式链接还是以`Base64`格式内嵌

## 原理

`UView-UI 2.0`因为`nvue`文件扩展字体图标无法实现的原因，未推出完善的扩展图标功能

但是可以直接复制`u-icon`组件，修改`iconfont`字体图标链接以及相关属性，以自定义组件方式实现扩展图标

手动实现复制组件较为麻烦（需要手动录入图标名与`unicode`的对应关系等），使用该工具即可快速生成
