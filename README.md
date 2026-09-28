# 福利行動導航 LINE Bot 介面模擬

這是純 HTML、CSS、JavaScript 網站。用 VS Code 開啟 `dist` 資料夾後，在 Mac 終端機執行 `open index.html` 即可預覽；不需要 `npm run dev`。

手機畫面右上角可切換中文、阿美語、泰雅語。切換時會重新開始示範對話。目前採雙語示範：下列問候與求助句有教材依據；其餘操作與福利說明保留中文，避免未經校對的翻譯造成申請誤解。

- 海岸阿美語：`Nga’ay ho!`、`Padangen ako kiso?`（需要我幫忙嗎？）
- 賽考利克泰雅語：`lokah su!`、`pragun misu ga?`（請問需要幫忙嗎？）

資料來源：[族語 E 樂園〈生活常用語〉](https://web.klokah.tw/lifesentences/)、[海岸阿美語求助句](https://web.klokah.tw/extension/con_practice/index.php?d=3&l=21&view=dialogue)、[賽考利克泰雅語求助句](https://web.klokah.tw/extension/con_practice/index.php?d=6&l=7&view=dialogue)。正式用於桃園市原住民集會所前，仍需請當地使用者或族語教師確認語別、拼寫及完整介面文案。

本原型專注三條完整使用流程：

1. 找福利：以生活情境分類，顯示適用對象、步驟、官方來源與查核日。
2. 申請準備：資格自評、可勾選文件清單、辦理方式。
3. 真人協助：問題分類、區域選擇、電話與官方窗口導向。

「桃園市原民敬老卡」用來示範完整申請流程，並連結官方來源；其他福利目前是流程示範。系統不會代替政府機關審核，也不應收集身分證號、病歷或金融帳戶等敏感資料。
