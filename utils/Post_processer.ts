import type { MarkdownPostProcessorContext, MetadataCache, Vault } from 'obsidian'
import { TFile } from 'obsidian'
import ExamplePlugin from "../main";
import {parseMarkdownText} from "./metadataAndMarkdown";

let plugin: ExamplePlugin
let vault: Vault
let metadataCache: MetadataCache

export function initializeMarkdownPostProcessor(p: ExamplePlugin) {
	plugin = p
	vault = p.app.vault
	metadataCache = p.app.metadataCache
}

/**
 * markdown 文本处理
 * 在 markdown 中出入 ![[*.univer.md]] 链接，就会触发此方法
 * @param el 父元素
 * @param ctx 上下文
 */
export async function markdownPostProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
	if(el.hasClass('components--DynamicDataView-PageCardCoverPreviewContent')){
		if(el.children[0].getAttribute('data-heading')=='metadata' && el.children[2].getAttribute('data-heading') == 'svgdata' && el.children[4].getAttribute('data-heading') == 'linkdata'){
			el.classList.add('linkMindCard')
			const svgdata = el.children[3].children[0].innerHTML
			const url = URL.createObjectURL(dataURItoBlob(svgdata))
			el.innerHTML = `<img src="${url}" width="100%" height="100%"></img>`
		}
		return
	}
	// console.log("markdownPostProcessor=============");
	// check to see if we are rendering in editing mode or live preview
	// if yes, then there should be no .internal-embed containers
	const embeddedItems = el.querySelectorAll('.internal-embed')
	// console.log("markdownPostProcessor", el);
	if (embeddedItems.length === 0) {
		// 编辑模式
		tmpObsidianWYSIWYG(el, ctx)
		return
	}

	// 预览模式
	await processReadingMode(embeddedItems, ctx)
}

// 编辑模式
async function tmpObsidianWYSIWYG(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath)
	// console.log('tmpObsidianWYSIWYG', ctx, el)
	if (!(file instanceof TFile))
		return
	if (!plugin.isLinkFile(file))
		return

	// @ts-expect-error
	if (ctx.remainingNestLevel < 4)
		return

	// @ts-expect-error
	const containerEl = ctx.containerEl
	let internalEmbedDiv: HTMLElement = containerEl
	while (
		!internalEmbedDiv.hasClass('dataview')
		&& !internalEmbedDiv.hasClass('cm-preview-code-block')
		&& !internalEmbedDiv.hasClass('cm-embed-block')
		&& !internalEmbedDiv.hasClass('internal-embed')
		&& !internalEmbedDiv.hasClass('markdown-reading-view')
		&& !internalEmbedDiv.hasClass('markdown-embed')
		&& internalEmbedDiv.parentElement
		) {
		internalEmbedDiv = internalEmbedDiv.parentElement
	}

	if (
		internalEmbedDiv.hasClass('dataview')
		|| internalEmbedDiv.hasClass('cm-preview-code-block')
		|| internalEmbedDiv.hasClass('cm-embed-block')
	) {
		return
	}

	const markdownEmbed = internalEmbedDiv.hasClass('markdown-embed')
	const markdownReadingView = internalEmbedDiv.hasClass(
		'markdown-reading-view',
	)
	if (
		!internalEmbedDiv.hasClass('internal-embed')
		&& (markdownEmbed || markdownReadingView)
	) {
		const isFrontmatterDiv = Boolean(el.querySelector('.frontmatter'))
		if (ctx.frontmatter) {
			el.empty()
		}
		else {
		//
		}

		if (!isFrontmatterDiv) {
			if (el.parentElement === containerEl) {
				containerEl.removeChild(el)
			}
		}
		internalEmbedDiv.empty()

		const data = await vault.read(file)
		const LinkDiv = document.createElement('img')
		const parsedata = parseMarkdownText(data)
		const svgdata = parsedata.svgdata
		const svgBlob = URL.createObjectURL(dataURItoBlob(svgdata))
		// @ts-ignore
		LinkDiv.src = svgBlob
		LinkDiv.draggable = false
		// @ts-ignore
		LinkDiv.setAttribute('fileSrc',file.path)
		setWidthByHand(LinkDiv)
		internalEmbedDiv.appendChild(LinkDiv)

		if (markdownEmbed) {
			// display image on canvas without markdown frame
			internalEmbedDiv.removeClass('markdown-embed')
			internalEmbedDiv.removeClass('inline-embed')
		}
		return
	}

	el.empty()

	if (internalEmbedDiv.hasAttribute('ready'))
		return

	internalEmbedDiv.setAttribute('ready', '')

	internalEmbedDiv.empty()

	const data = await vault.read(file)
	const LinkDiv = document.createElement('img')
	const parsedata = parseMarkdownText(data)
	const svgdata = parsedata.svgdata
	const svgBlob = URL.createObjectURL(dataURItoBlob(svgdata))
	// @ts-ignore
	LinkDiv.src = svgBlob
	LinkDiv.draggable = false
	// @ts-ignore
	LinkDiv.setAttribute('fileSrc',file.path)
	setWidthByHand(LinkDiv)
	internalEmbedDiv.appendChild(LinkDiv)

	internalEmbedDiv.appendChild(LinkDiv)

	if (markdownEmbed) {
		// display image on canvas without markdown frame
		internalEmbedDiv.removeClass('markdown-embed')
		internalEmbedDiv.removeClass('inline-embed')
	}
}
function setWidthByHand(LinkDiv: HTMLImageElement){
	if(!plugin.settings.changeWidth){
		LinkDiv.style.width = '100%'
		LinkDiv.style.height = '100%'
		LinkDiv.classList.add('LinkMind-embed-Image')
	}
	if(plugin.settings.dbclickSrc){
		LinkDiv.addEventListener('dblclick',()=>{
			// @ts-ignore
			plugin.app.workspace.openLinkText(LinkDiv.getAttribute('fileSrc'), '', false);
		})
	}
}
// 预览模式解析
async function processReadingMode(embeddedItems: NodeListOf<Element> | [HTMLElement], ctx: MarkdownPostProcessorContext) {
	// console.log("processReadingMode")
	// We are processing a non-univer file in reading mode
	// Embedded files will be displayed in an .internal-embed container

	// Iterating all the containers in the file to check which one is an univer drawing
	// This is a for loop instead of embeddedItems.forEach() because processInternalEmbed at the end
	// is awaited, otherwise univer images would not display in the univer plugin
	embeddedItems.forEach(async (maybeUniver, _) => {
		// check to see if the file in the src attribute exists
		// console.log(maybeDrawing);
		const fname = maybeUniver.getAttribute('src')?.split('#')[0]
		if (!fname)
			return true

		const file = metadataCache.getFirstLinkpathDest(fname, ctx.sourcePath)
		// console.log('forEach', file, ctx.sourcePath)

		// if the embeddedFile exits and it is an univer file
		// then lets replace the .internal-embed with the generated PNG or SVG image
		if (file && file instanceof TFile && plugin.isLinkFile(file)) {
			const parent = maybeUniver.parentElement
			const data = await vault.read(file)
			const LinkDiv = processInternalEmbed(maybeUniver, file, data)
			parent?.replaceChild(LinkDiv, maybeUniver)
		}
	})
}

function processInternalEmbed(internalEmbedEl: Element, file: TFile, data: string): HTMLDivElement {
	const src = internalEmbedEl.getAttribute('src')

	if (!src)
		return createDiv()

	// https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/1059
	internalEmbedEl.removeClass('markdown-embed')
	internalEmbedEl.removeClass('inline-embed')
	const LinkDiv = document.createElement('img')
	const parsedata = parseMarkdownText(data)
	const svgdata = parsedata.svgdata
	const svgBlob = URL.createObjectURL(dataURItoBlob(svgdata))
	// @ts-ignore
	LinkDiv.src = svgBlob
	LinkDiv.draggable = false
	// @ts-ignore
	LinkDiv.setAttribute('fileSrc',file.path)
	setWidthByHand(LinkDiv)
	return LinkDiv
}
function dataURItoBlob(dataURI: string) {
	const byteString = atob(dataURI.split(',')[1]);
	const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
	const ab = new ArrayBuffer(byteString.length);
	const ia = new Uint8Array(ab);
	for (let i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	return new Blob([ab], {type: mimeString});
}
