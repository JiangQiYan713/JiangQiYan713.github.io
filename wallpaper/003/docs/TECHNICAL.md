# 图层顺序

```
0  city             city_4k.png          全屏 3840×2160 PNG
1  left             hair_left/000..047   565×555 RGBA
2  right            hair_right/000..047  557×690 RGBA
3  body             character.png        1672×941 RGBA
4  other            hair_other/000..047  265×251 RGBA
20 particles        canvas + 3 sprites   视口像素
```

所有位置通过 `config/config.json` 中的 `bounds` 注册到逻辑画布 1672×941；背景实际输出源为 3840×2160。HTML 用 cover 放大以防宽高比不匹配时出现上下模糊边带。灯光候选点来自被绘画点亮的真实楼体区域，不随机绘制在全屏任意位置。

帧公式：`index = floor(elapsed × fps × windSpeed + phase × frameCount) % frameCount`。离线导出采用具有连续周期的风向场，并将每帧烘焙成完整单张 PNG。HTML 不对原始人物做实时网格或骨骼变形。

注意：底图的被人物遮挡区域是近似重建，发丝轮廓大幅度改变时需要重新设计背景。源插画与逐帧动画不应宣传为 4K 原生手绘。
