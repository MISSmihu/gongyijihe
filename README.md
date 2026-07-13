# 公益集盒

一个适合 GitHub Pages 的 AI API 公益站导航。前台支持搜索、分类筛选、排序、深浅主题和响应式布局；内容保存在 `data/sites.json`，并提供 `/admin/` 管理页面。

## 网站地址

完成首次部署后访问：

<https://missmihu.github.io/gongyijihe/>

管理页面：

<https://missmihu.github.io/gongyijihe/admin/>

## 首次部署

首次推送后，`Deploy GitHub Pages` 工作流会自动初始化 Pages 并部署网站。打开仓库的 `Actions` 页面，等待该工作流运行完成即可。

如果组织或仓库策略禁止自动初始化，请打开 `Settings > Pages`，在 `Build and deployment` 中将 Source 手动设为 `GitHub Actions`，然后重新运行工作流。

以后每次向 `main` 分支提交内容，GitHub Actions 都会自动更新网站。

## 使用管理后台

管理后台直接调用 GitHub Contents API，不需要额外服务器。

1. 打开 GitHub 的 [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new) 页面。
2. Repository access 只选择 `MISSmihu/gongyijihe`。
3. 在 Repository permissions 中将 `Contents` 设为 `Read and write`，其他权限保持默认。
4. 创建 Token 后进入网站的 `/admin/`，填入 Token 并连接。
5. 新增或编辑内容，最后点击“发布到网站”。

Token 只保存在当前浏览器的 `sessionStorage` 中，不会写入仓库。不要把 Token 发给其他人，也不要在公共电脑上使用管理后台。

前台图标脚本已固定版本并保存在仓库本地，不会在管理会话中执行第三方 CDN 脚本。

## 内容结构

所有内容在 [`data/sites.json`](data/sites.json) 中：

```json
{
  "id": "example",
  "order": 1,
  "name": "示例站点",
  "url": "https://example.com/register",
  "benefit": "注册送额度",
  "category": "常规",
  "recommended": false,
  "active": true,
  "notes": "仅在后台显示",
  "updatedAt": "2026-07-13"
}
```

将 `active` 设为 `false` 可以让内容暂时从前台下线，同时保留后台记录。

## 本地预览

请通过本地 HTTP 服务预览，直接双击 `index.html` 时浏览器可能阻止读取 JSON。

```powershell
python -m http.server 8080
```

然后打开 <http://localhost:8080/>。

## 数据说明

初始站点资料整理自 [AX7795/free-api-sites](https://github.com/AX7795/free-api-sites)。赠送额度、倍率和模型支持情况可能随时变化，请以对应站点实时页面为准。部分链接含邀请参数。
