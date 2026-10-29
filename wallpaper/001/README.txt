OC 赛博朋克动态壁纸 · v1.1 离线修复版

使用：完整解压 ZIP，然后双击解压后的 oc_cyberpunk_wallpaper/index.html。
支持 Chromium / Edge / Firefox 现代版本。无需服务器、联网或插件。

修复内容：
- 移除了 file:// 模式下可能触发 SecurityError 的 Canvas.getImageData()。
- 城市灯光坐标在制作期间从清晰背景 PNG 的建筑窗户像素预计算，存于 data/window_lights.js。
- 修正帧图片缩放后未居中、双马尾不在正确位置的问题。
- 头发采用左右各 24 帧离线预计算的完整 PNG 图像序列，不进行浏览器端实时木偶变形或中间帧叠图。
- 优先加载 5 个初始可见图层，避免等全部动画帧加载完才显示。若素材路径有误，页面直接显示对应错误路径。

美术说明：各部件是从 OC 特征重新绘制的原始 PNG 美术；发丝动画由这些重绘母图通过离线的轻微周期性流场位移预计算得到，并不是 24 张逐张手绘稿。所有素材都是完整透明 PNG。保留在 assets/source_redraws/ 下的重绘来源可用于继续改画和匹配图层。

项目结构：
index.html            网页入口
css/style.css         设置面板样式
js/app.js             Canvas 播放器、粒子、交互与错误信息
data/config.js        外部资产 manifest 与参数，所有位置、缩放、z 顺序、帧率等
 data/window_lights.js 预采样城市窗灯位置
assets/background/    纯背景 1 PNG
assets/body/          人物主体 1 PNG
assets/hair_left/     左发尾 24 PNG
assets/hair_right/    右发尾 24 PNG
assets/hair_other/    其他头发 1 PNG
assets/source_redraws/ 美术来源，运行时不加载

播放：拖动鼠标会推动粒子并带来背景视差；右下角齿轮打开设置；按 S 可隐藏/打开设置。
窗口灯闪烁采样仅用于识别建筑物的原有发光点，不额外创造漂浮在楼体外的窗户。
渲染分辨率适配屏幕 DPR 上限 1.8，背景原图不预处理模糊，CSS/Canvas 参数可调。

注意：不应直接在 ZIP 预览器中打开 index.html，先完整解压所有文件。
