import {
	addIcon,
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile, TFolder, ViewState, Workspace,
	WorkspaceLeaf
} from 'obsidian'
import {SMMView, VIEW_TYPE_SMM} from "./view"
// @ts-ignore
import moment = require("moment")
import {around, dedupe} from "monkey-around";
import {assembleMarkdownText} from "./utils/metadataAndMarkdown";
import {default_file, default_linkdata, default_svgdata} from "./constant";
import {initializeMarkdownPostProcessor, markdownPostProcessor} from "./utils/Post_processer";
//----------------------------
interface MyPluginSettings {
	myInputFolderPath: string;
	cartoon: boolean;
	myInputWater: string;
	changeWidth: boolean;
	cacheSize: number;
	dbclickSrc: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	myInputFolderPath: '',
	myInputWater: '',
	cartoon: false,
	changeWidth: false,
	cacheSize: 65000,
	dbclickSrc: true,
};
export default class ExamplePlugin extends Plugin {
	settings: MyPluginSettings;
	async onload() {
		addIcon('ob-smm-brain', `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 2H7.32297L8.52297 5H3V7H5.11765L5.94463 21.0587C5.97572 21.5873 6.41343 22 6.9429 22H17.0571C17.5866 22 18.0243 21.5873 18.0554 21.0587L18.8824 7H21V5H10.677L8.67703 0H4V2ZM7.29906 10.0252L7.1211 7H16.8789L16.5867 11.9675C14.28 11.853 13.4226 11.4919 12.3713 11.0714C11.2792 10.6347 9.97065 10.1354 7.29906 10.0252ZM7.41714 12.0326C9.72097 12.1473 10.5894 12.5128 11.6401 12.933C12.7001 13.357 13.9556 13.8375 16.4692 13.9641L16.1142 20H7.88581L7.41714 12.0326Z"></path></svg>
		`)
		await this.loadSettings();
		this.registerView(VIEW_TYPE_SMM, (leaf: WorkspaceLeaf) => new SMMView(leaf));
		this.registerExtensions(["Link"], VIEW_TYPE_SMM);
		this.addCommand({
			id: 'create a LinkMind mindmap',
			name: 'Create a LinkMind File',
			callback: async () => {
				const {vault} = this.app;
				const date = new Date();
				const formattedDate = moment(date).format('YYYY-MM-DD-HH-mm-ss');
				const fileName = `${this.settings.myInputFolderPath}/Link-${formattedDate}.Link.md`;
				const fileContent =assembleMarkdownText({metadata:{path: `${fileName}`,tags: ['linkMind'],content:default_file},svgdata: default_svgdata,linkdata:default_linkdata})

				try {
					// 检查文件是否已存在
					const existingFile = vault.getAbstractFileByPath(fileName);
					if (existingFile) {
						new Notice('文件已经存在',3000);
					} else {
						// 创建新文件
						await vault.create(fileName, fileContent);
						await this.app.workspace.openLinkText(fileName, '', false);
					}
				} catch (error) {
					new Notice('创建导图失败' + error, 3000);
				}
			}
		})
		this.addCommand({
			id: 'create mindmap and insert into markdown',
			name: 'Create a LinkMind File and insert Into file',
			editorCallback: async (editor) => {
				const {vault} = this.app;
				const date = new Date();
				const formattedDate = moment(date).format('YYYY-MM-DD-HH-mm-ss');
				const fileName = `${this.settings.myInputFolderPath}/Link-${formattedDate}.Link.md`;
				const fileContent =assembleMarkdownText({metadata:{path: `${fileName}`,tags: ['linkMind'],content:default_file},svgdata: default_svgdata,linkdata:default_linkdata})

				try {
					// 检查文件是否已存在
					const existingFile = vault.getAbstractFileByPath(fileName);
					if (existingFile) {
						new Notice('文件已经存在',3000);
					} else {
						// 创建新文件
						await vault.create(fileName, fileContent);
						const file = this.app.vault.getAbstractFileByPath(fileName);
						const currentFile = this.app.workspace.getActiveFile()
						if(currentFile?.extension !==  'md') {
							new Notice('当前文件不是markdown文件')
							return
						}
						// @ts-ignore
						const linkText = this.app.fileManager.generateMarkdownLink(
							// @ts-ignore
							file,           // 目标文件
							currentFile?.path || '', // 当前文件路径（用于相对路径）
							'',                   // 可选：链接显示文本（留空则使用文件名）
							// @ts-ignore
							file.name                 // 是否使用标题作为链接文本
						);
						editor.replaceSelection('!'+linkText);
					}
				} catch (error) {
					new Notice('创建导图失败' + error, 3000);
				}
			}
		})
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				// 仅在文件夹上显示菜单项
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle('创建思维导图')
							.setIcon('ob-smm-brain')
							.onClick(async () => {
								const {vault} = this.app;
								const date = new Date();
								const formattedDate = moment(date).format('YYYY-MM-DD-HH-mm-ss');
								const fileName = `${file.name}/Link-${formattedDate}.Link.md`;
								const fileContent =assembleMarkdownText({metadata:{path: `${fileName}`,tags: ['linkMind'],content:default_file},svgdata: default_svgdata,linkdata:default_linkdata})

								try {
									// 检查文件是否已存在
									const existingFile = vault.getAbstractFileByPath(fileName);
									if (existingFile) {
										new Notice('文件已经存在',3000);
									} else {
										// 创建新文件
										await vault.create(fileName, fileContent);
										await this.app.workspace.openLinkText(fileName, '', false);
									}
								} catch (error) {
									new Notice('创建导图失败' + error, 3000);
								}
							});
					});
				}
			}))
		this.addSettingTab(new MySettingTab(this.app, this));
		this.addRibbonIcon('ob-smm-brain', 'create a LinkMind mindmap', async () => {
			// 当按钮被点击时，在控制台输出信息
			const {vault} = this.app;
			const date = new Date();
			const formattedDate = moment(date).format('YYYY-MM-DD-HH-mm-ss');
			const fileName = `${this.settings.myInputFolderPath}/Link-${formattedDate}.Link.md`;
			const fileContent =assembleMarkdownText({metadata:{path: `${fileName}`,tags: ['linkMind'],content:default_file},svgdata: default_svgdata,linkdata:default_linkdata})
			try {
				// 检查文件是否已存在
				const existingFile = vault.getAbstractFileByPath(fileName);
				if (existingFile) {
					new Notice('文件已经存在',3000);
				} else {
					// 创建新文件
					await vault.create(fileName, fileContent);
					await this.app.workspace.openLinkText(fileName, '', false);
				}
			} catch (error) {
				new Notice('创建导图失败' + error, 3000);
			}
		});
		// @ts-ignore
		this.app.settings = this.settings
		// ----------------------------------------------------------------------------
		this.registerMonkeyPatches()
		this.switchToLinkAfterLoad()
		// console.log("addMarkdownPostProcessor--------")
		initializeMarkdownPostProcessor(this)
		this.registerMarkdownPostProcessor(markdownPostProcessor)
		// @ts-ignore
		this.app.vault.cacheLimit = this.app.settings.cacheSize

	}





	private switchToLinkAfterLoad() {
		this.app.workspace.onLayoutReady(() => {
			let leaf: WorkspaceLeaf
			const markdownLeaf = this.app.workspace.getLeavesOfType('markdown')
			for (leaf of markdownLeaf) {
				if (
					leaf.view instanceof MarkdownView
					&& leaf.view.file
					&& this.isLinkFile(leaf.view.file)
				) {
					this.setLinkView(leaf)
				}
			}
		})
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

	}

	async saveSettings() {
		this.saveData(this.settings)
		this.removeCommand('create a smm mindmap');
		this.addCommand({
			id: 'create a smm mindmap',
			name: 'Create a SimpleMindMap File',
			callback: async () => {
				const {vault} = this.app;
				const date = new Date();
				const formattedDate = moment(date).format('YYYY-MM-DD-HH-mm-ss');
				const fileName = `${this.settings.myInputFolderPath}/SMM-${formattedDate}.smm`;
				const fileContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1.94607 9.31543C1.42353 9.14125 1.4194 8.86022 1.95682 8.68108L21.043 2.31901C21.5715 2.14285 21.8746 2.43866 21.7265 2.95694L16.2733 22.0432C16.1223 22.5716 15.8177 22.59 15.5944 22.0876L11.9999 14L17.9999 6.00005L9.99992 12L1.94607 9.31543Z"></path></svg>
				`
				try {
					// 检查文件是否已存在
					const existingFile = vault.getAbstractFileByPath(fileName);
					if (existingFile) {
						new Notice('文件已经存在',3000);
					} else {
						// 创建新文件
						await vault.create(fileName, fileContent);
						await this.app.workspace.openLinkText(fileName, '', false);
					}
				} catch (error) {
					new Notice('创建SMM文件失败'+error,3000);
				}
			}
		})
	}

	async onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_SMM);
	}
	private registerMonkeyPatches() {
		const key = 'https://github.com/LXiangEthan/obsidian-simplemindmap'
		this.register(
			around(Workspace.prototype, {
				getActiveViewOfType(old) {
					return dedupe(key, old, function (...args) {
						const result = old && old.apply(this, args)

						const maybeLinkView = this.app?.workspace?.activeLeaf?.view
						if (!maybeLinkView || !(maybeLinkView instanceof SMMView))
							return result
					})
				},
			}),
		)

		// @ts-expect-error
		if (!this.app.plugins?.plugins?.['obsidian-hover-editor']) {
			this.register(
				// stolen from hover editor
				around(WorkspaceLeaf.prototype, {
					getRoot(old) {
						return function () {
							const top = old.call(this)
							return top.getRoot === this.getRoot ? top : top.getRoot()
						}
					},
				}),
			)
		}

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this
		// Monkey patch WorkspaceLeaf to open Excel with ExcelProView by default
		this.register(
			around(WorkspaceLeaf.prototype, {
				detach(next) {
					return function () {
						return next.apply(this)
					}
				},

				setViewState(next) {
					return function (state: ViewState, ...rest: any[]) {
						if (
							// @ts-ignore
							self._loaded
							// If we have a markdown file
							&& state.type === 'markdown'
							&& state.state?.file
						) {
							// @ts-ignore
							const cache = self.app.metadataCache.getCache(state.state.file)

							// console.log("setViewState cache cccc", cache)
							if (
								(cache?.frontmatter?.tags?.contains('linkMind'))
								// @ts-ignore
								|| state.state.file.contains('.Link.md')
							) {
								const newState = {
									...state,
									type: VIEW_TYPE_SMM,
								}

								return next.apply(this, [newState, ...rest])
							}
						}

						return next.apply(this, [state, ...rest])
					}
				},
			}),
		)
	}
	public async setLinkView(leaf: WorkspaceLeaf) {
		await leaf.setViewState({
			type: VIEW_TYPE_SMM,
			state: leaf.view.getState(),
			popstate: true,
		} as ViewState)
	}
	public isLinkFile(file:TFile){
		if(!file){
			return false;
		}
		if (file.extension === 'Link')
			return true
		const cache = this.app.metadataCache.getFileCache(file)
		if(cache?.frontmatter?.tags?.contains('linkMind')){
			return true
		}
		return false
	}

}



class MySettingTab extends PluginSettingTab {
	plugin: ExamplePlugin;

	constructor(app: App, plugin: ExamplePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Ob-smm' });

		new Setting(containerEl)
			.setName('输入您保存文件的路径')
			.setDesc('input the path of folder')
			.addText(text => text
				.setPlaceholder('The path of folder')
				.setValue(this.plugin.settings.myInputFolderPath)
				.onChange(async (value) => {
					this.plugin.settings.myInputFolderPath = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('输入您的水印文字')
			.setDesc('input the name of watermarkConfig')
			.addText(text => text
				.setPlaceholder('The watermarkConfig')
				.setValue(this.plugin.settings.myInputWater)
				.onChange(async (value) => {
					this.plugin.settings.myInputWater = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName("是否开启启动动画")
			.setDesc("open the cartoon before opening")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.cartoon)
				.onChange(async (value) => {
					this.plugin.settings.cartoon = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName("是否开启手动调节文档嵌入图片大小")
			.setDesc("change the width of image of doc by finger")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.changeWidth)
				.onChange(async (value) => {
					this.plugin.settings.changeWidth = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("是否开启双击点击跳转")
			.setDesc("double clicks will goto the souce of mindmap")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.dbclickSrc)
				.onChange(async (value) => {
					this.plugin.settings.dbclickSrc = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName('输入缓存大小')
			.setDesc('input the size of cache')
			.addText(text => text
				.setPlaceholder('xxByte')
				.setValue(String(this.plugin.settings.cacheSize))
				.onChange(async (value) => {
					this.plugin.settings.cacheSize = Number(value);
					await this.plugin.saveSettings();
				}));
	}
}
