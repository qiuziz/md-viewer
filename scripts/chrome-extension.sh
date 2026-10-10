#!/usr/bin/env bash
# chrome-extension.sh — 构建并把 MD Viewer 扩展安装/更新到本机 Google Chrome
#
# 用法：
#   ./scripts/chrome-extension.sh              # 构建 + 自动安装或更新
#   ./scripts/chrome-extension.sh --no-build   # 跳过构建，仅安装/更新（使用当前产物）
#
# 行为：
#   - 已安装：在 chrome://extensions 详情页点击「重新加载」完成更新
#   - 未安装：点击「加载未打包的扩展程序」并通过对话框选择 .output/chrome-mv3
#   - 加载后确保「允许访问文件网址」开关为开启
#   - 所有确认动作前先校验弹窗内容：选择目录前必须看到 manifest.json，校验失败即中止
#
# 安全约定（必须遵守）：
#   - 仅操作页面中「全局唯一」的按钮名（如『加载未打包的扩展程序』『选择』『详情页的重新加载』）
#   - 禁止自动化卡片级同名按钮（『移除』『详情』『重新加载』在列表中各有 N 个）：
#     实测 AXPress 可能落到第一张卡片的同名按钮上，且虚拟列表下按钮坐标不可信；
#     本脚本不包含任何移除/删除功能，卸载请在扩展页手动完成
#   - 任何「移除/删除」类确认弹窗（实际文案为「要删除“xxx”吗？」），
#     只有弹窗内容明确显示目标扩展「MD Viewer」时才允许点击确认
#
# 说明：
#   - 扩展 ID 由构建目录绝对路径的 SHA-256 推导（Chromium 规则），路径不变则 ID 不变
#   - 依赖 macOS 辅助功能/自动化权限（System Events 控制 Chrome）
#   - 仅适用于 macOS + Google Chrome 默认用户数据目录

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
EXT_DIR="$REPO_ROOT/.output/chrome-mv3"

usage() {
  sed -n '2,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

BUILD=true
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=false ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数: $arg（使用 --help 查看用法）" >&2; exit 2 ;;
  esac
done

if $BUILD; then
  echo "==> 构建扩展（npm run compile && npm run build）"
  (cd "$REPO_ROOT" && npm run compile && npm run build)
fi

if [[ ! -f "$EXT_DIR/manifest.json" ]]; then
  echo "错误：构建产物不存在：$EXT_DIR/manifest.json" >&2
  echo "请先执行 npm run build，或去掉 --no-build 参数。" >&2
  exit 1
fi

# Chromium 扩展 ID 规则：绝对路径 SHA-256 前 16 字节，每个十六进制位 0-f 映射为 a-p
EXT_ID="$(printf '%s' "$EXT_DIR" | shasum -a 256 | cut -c1-32 | perl -pe 's/([0-9a-f])/chr(97+hex($1))/ge')"
if [[ ${#EXT_ID} -ne 32 ]]; then
  echo "错误：扩展 ID 计算失败：$EXT_ID" >&2
  exit 1
fi

echo "==> 扩展目录: $EXT_DIR"
echo "==> 扩展 ID : $EXT_ID"

APPLESCRIPT_FILE="$(mktemp -t mdviewer-chrome-load)"
trap 'rm -f "$APPLESCRIPT_FILE"' EXIT

cat > "$APPLESCRIPT_FILE" <<'APPLESCRIPT'
-- 通过 System Events 驱动 Chrome 完成扩展的加载/刷新。
-- 参数：argv = {扩展ID, 扩展目录}
on run argv
	set extId to item 1 of argv
	set extDir to item 2 of argv
	set extName to "MD Viewer"
	set loadBtnCandidates to {"加载未打包的扩展程序", "Load unpacked"}
	set reloadBtnCandidates to {"重新加载", "Reload"}
	set selectBtnCandidates to {"选择", "Select", "Choose", "打开", "Open"}
	set fileAccessPrefixes to {"允许访问文件网址", "Allow access to file"}

	-- 1. 打开扩展详情页（已安装时直接显示详情）
	do shell script "/usr/bin/open -a 'Google Chrome' 'chrome://extensions/?id=" & extId & "'"
	delay 1.0
	my prepareChrome()

	set installed to false
	repeat 20 times
		delay 0.5
		if my containsText(extName) then
			set installed to true
			exit repeat
		end if
		if my webButtonExists(loadBtnCandidates) then exit repeat
	end repeat

	if installed then
		-- 2a. 已安装：点击详情页上的「重新加载」完成更新
		if not my clickWebButton(reloadBtnCandidates) then error "已安装，但未找到详情页上的『重新加载』按钮"
		delay 1.5
		set fileState to my ensureFileAccess(fileAccessPrefixes)
		return "updated|fileAccess=" & fileState
	end if

	-- 2b. 未安装：回到列表页，点击「加载未打包的扩展程序」
	do shell script "/usr/bin/open -a 'Google Chrome' 'chrome://extensions/'"
	delay 1.2
	set sawLoadBtn to false
	repeat 20 times
		delay 0.5
		if my webButtonExists(loadBtnCandidates) then
			set sawLoadBtn to true
			exit repeat
		end if
	end repeat
	if not sawLoadBtn then error "未找到『加载未打包的扩展程序』按钮，请确认 Chrome 已开启开发者模式"

	if not my clickWebButton(loadBtnCandidates) then error "点击『加载未打包的扩展程序』失败"

	-- 3. 文件选择对话框：前往扩展目录并确认
	set the clipboard to extDir
	set sheetShown to false
	repeat 12 times
		delay 0.5
		if my sheetCount() > 0 then
			set sheetShown to true
			exit repeat
		end if
	end repeat
	if not sheetShown then error "文件选择对话框未出现"

	tell application "System Events" to keystroke "g" using {command down, shift down}
	delay 0.8
	tell application "System Events" to keystroke "v" using {command down}
	delay 0.6
	tell application "System Events" to key code 36
	delay 1.0

	-- 确认前校验：对话框必须已定位到扩展构建产物（能看到 manifest.json），否则中止不点「选择」
	set dirConfirmed to false
	repeat 10 times
		if my sheetContainsText("manifest.json") then
			set dirConfirmed to true
			exit repeat
		end if
		delay 0.5
	end repeat
	if not dirConfirmed then error "文件选择对话框未定位到扩展目录（未出现 manifest.json），已中止，未点击『选择』"

	set selectClicked to false
	repeat 10 times
		if my clickSheetButton(selectBtnCandidates) then
			set selectClicked to true
			exit repeat
		end if
		delay 0.5
	end repeat
	if not selectClicked then error "未找到文件选择对话框中的『选择』按钮"

	set sheetClosed to false
	repeat 16 times
		delay 0.5
		if my sheetCount() is 0 then
			set sheetClosed to true
			exit repeat
		end if
	end repeat
	if not sheetClosed then error "文件选择对话框未关闭（可能选择了错误的目录）"

	-- 4. 回到详情页确认加载成功，并确保文件访问开关开启
	do shell script "/usr/bin/open -a 'Google Chrome' 'chrome://extensions/?id=" & extId & "'"
	delay 1.2
	set loadConfirmed to false
	repeat 20 times
		delay 0.5
		if my containsText(extName) then
			set loadConfirmed to true
			exit repeat
		end if
	end repeat
	if not loadConfirmed then error "加载完成后未在详情页检测到扩展：" & extName

	set fileState to my ensureFileAccess(fileAccessPrefixes)
	return "installed|fileAccess=" & fileState
end run

-- ===== 以下为辅助函数 =====

on prepareChrome()
	activate application "Google Chrome"
	delay 0.5
	tell application "System Events" to tell process "Google Chrome"
		try
			set value of attribute "AXEnhancedUserInterface" to true
		end try
		set frontmost to true
	end tell
	delay 0.3
end prepareChrome

-- 任意窗口的 AX 树上是否存在包含 needle 的文本/名称
on containsText(needle)
	tell application "System Events" to tell process "Google Chrome"
		repeat with w in windows
			if my elHasText(w, needle, 0) then return true
		end repeat
	end tell
	return false
end containsText

on elHasText(el, needle, depth)
	if depth > 25 then return false
	tell application "System Events"
		set nm to ""
		try
			set nv to name of el
			if nv is not missing value then set nm to nv as text
		end try
		if nm contains needle then return true
		try
			set kids to UI elements of el
		on error
			return false
		end try
		repeat with k in kids
			try
				if my elHasText(k, needle, depth + 1) then return true
			end try
		end repeat
	end tell
	return false
end elHasText

-- 网页区域内是否存在指定名称的按钮（避免匹配到浏览器工具栏的同名按钮）
on webButtonExists(candidates)
	tell application "System Events" to tell process "Google Chrome"
		repeat with w in windows
			if my walkButtons(w, candidates, false, true, false, 0) then return true
		end repeat
	end tell
	return false
end webButtonExists

on clickWebButton(candidates)
	tell application "System Events" to tell process "Google Chrome"
		repeat with w in windows
			if my walkButtons(w, candidates, true, true, false, 0) then return true
		end repeat
	end tell
	return false
end clickWebButton

-- 在文件选择对话框（sheet）内点击按钮
on clickSheetButton(candidates)
	tell application "System Events" to tell process "Google Chrome"
		repeat with w in windows
			try
				repeat with sh in sheets of w
					if my walkButtons(sh, candidates, true, false, false, 0) then return true
				end repeat
			end try
		end repeat
	end tell
	return false
end clickSheetButton

on sheetCount()
	tell application "System Events" to tell process "Google Chrome"
		set n to 0
		repeat with w in windows
			try
				set n to n + (count of sheets of w)
			end try
		end repeat
		return n
	end tell
end sheetCount

-- 文件选择对话框（sheet）内是否存在包含 needle 的文本
on sheetContainsText(needle)
	tell application "System Events" to tell process "Google Chrome"
		repeat with w in windows
			try
				repeat with sh in sheets of w
					if my elHasText(sh, needle, 0) then return true
				end repeat
			end try
		end repeat
	end tell
	return false
end sheetContainsText

on walkButtons(el, candidates, doClick, requireWeb, inWeb, depth)
	if depth > 25 then return false
	tell application "System Events"
		set r to ""
		try
			set r to role of el as text
		end try
		set nowInWeb to inWeb
		if r is "AXWebArea" then set nowInWeb to true
		if r is "AXButton" and ((requireWeb is false) or nowInWeb) then
			set nm to ""
			try
				set nv to name of el
				if nv is not missing value then set nm to nv as text
			end try
			repeat with cand in candidates
				try
					if nm is (cand as text) then
						if doClick then click el
						return true
					end if
				end try
			end repeat
		end if
		try
			set kids to UI elements of el
		on error
			return false
		end try
		repeat with k in kids
			try
				if my walkButtons(k, candidates, doClick, requireWeb, nowInWeb, depth + 1) then return true
			end try
		end repeat
		return false
	end tell
end walkButtons

-- 确保「允许访问文件网址」开关为开启；返回 already-on / turned-on / toggle-failed / not-found
on ensureFileAccess(prefixes)
	tell application "System Events" to tell process "Google Chrome"
		repeat with w in windows
			set cbState to my setCheckboxOn(w, prefixes, 0)
			if cbState is not "not-found" then return cbState
		end repeat
	end tell
	return "not-found"
end ensureFileAccess

on setCheckboxOn(el, prefixes, depth)
	if depth > 25 then return "not-found"
	tell application "System Events"
		set r to ""
		try
			set r to role of el as text
		end try
		if r is "AXCheckBox" then
			set nm to ""
			try
				set nv to name of el
				if nv is not missing value then set nm to nv as text
			end try
			repeat with p in prefixes
				try
					if nm contains (p as text) then
						set v to 0
						try
							set v to value of el
						end try
						if (v as integer) is 0 then
							click el
							delay 0.5
							set v2 to 0
							try
								set v2 to value of el
							end try
							if (v2 as integer) is 1 then return "turned-on"
							return "toggle-failed"
						end if
						return "already-on"
					end if
				end try
			end repeat
		end if
		try
			set kids to UI elements of el
		on error
			return "not-found"
		end try
		repeat with k in kids
			try
				set sub to my setCheckboxOn(k, prefixes, depth + 1)
				if sub is not "not-found" then return sub
			end try
		end repeat
		return "not-found"
	end tell
end setCheckboxOn
APPLESCRIPT

echo "==> 在 Chrome 中执行加载/更新（请勿在此期间操作键盘）"
RESULT="$(osascript "$APPLESCRIPT_FILE" "$EXT_ID" "$EXT_DIR")"

case "$RESULT" in
  updated*)
    echo "==> 已更新：扩展已重新加载（${RESULT}）"
    echo "    提示：验证时打开任意 .md 文件即可看到渲染效果。"
    ;;
  installed*)
    echo "==> 已安装：扩展加载成功（${RESULT}）"
    ;;
  *)
    echo "==> 完成，但返回状态未知：${RESULT}" >&2
    exit 1
    ;;
esac
