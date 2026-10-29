OC NEON · 四图层动态壁纸 V4（身体缺失 / 头发混入身体修正版）

解压后直接双击 index.html。保持 scene_pack、app.js 与 index.html 的相对目录不变。
支持 Chrome / Edge 等现代浏览器，完全离线，无需安装依赖。

本次具体修复：
1. 人物脸部、脖颈、蝴蝶结、肩膀、袖子和衣服全部保留在 body/frame_000.png。身体不再从大面积矩形扣除。
2. hair_left 和 hair_right 只包含外侧双马尾发丝，不包含衣服、脸部或肩膀。
3. 发根边界固定不动，仅远离接缝的发梢逐帧轻微飘动；不再使用网页端木偶算法、眨眼图叠加或矩形切割变形。
4. 背景为无人原始高清图；模糊和亮度保留为 scene.json 配置，通过 Canvas 实时实现。
5. 仍保留鼠标粒子互动与基于背景亮点定位的窗灯闪烁。

数据包说明：
- scene_pack/scene.json ：可编辑图层位置、速度、顺序、帧数、动画信息（资料文件）
- scene_pack/scene.js ：离线读取用配置，必须与 scene.json 同步修改
- scene_pack/background/frame_000.png ：无人物背景，1帧
- scene_pack/body/frame_000.png ：完整躯体（含面部和稳定发根），1帧
- scene_pack/hair_left/frame_000.png ~ frame_031.png ：纯左马尾，32帧
- scene_pack/hair_right/frame_000.png ~ frame_031.png ：纯右马尾，32帧
- app.js ：公共播放器，主要负责资源加载、图层排序和粒子，无木偶动画

可视化检查：
按 H 打开/关闭角落提示，按 D 开始图层检查，按 1–4 分别单独查看背景、左发、右发、身体，按 0 恢复全部图层。

说明：独立人物采用此前重绘透明原画，对同一角色素材重新做了头发/身体所有权分割，确保图层不会混入衣袖等身体内容。本次没有再生成新的人物立绘。
