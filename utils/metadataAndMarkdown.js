export const parseMarkdownText = (text)=>{
	const result = {
		metadata: { path: '', tags: [], content: '' },
		svgdata: '',
		linkdata: []
	};

	// Split text into lines
	const lines = text.split('\n');
	let currentSection = '';
	let inCodeBlock = false;
	let inYamlHeader = false;
	let codeBlockContent = [];

	for (const line of lines) {
		// Handle YAML header
		if (line.trim() === '---') {
			inYamlHeader = !inYamlHeader;
			continue;
		}

		// Check for section headers
		if (line.startsWith('# metadata')) {
			currentSection = 'metadata';
			continue;
		} else if (line.startsWith('# svgdata')) {
			currentSection = 'svgdata';
			continue;
		} else if (line.startsWith('# linkdata')) {
			currentSection = 'linkdata';
			continue;
		}

		// Handle code blocks
		if (line.trim() === '```metadata' || line.trim() === '```svgData') {
			inCodeBlock = true;
			continue;
		} else if (line.trim() === '```' && inCodeBlock) {
			inCodeBlock = false;
			if (currentSection === 'metadata') {
				result.metadata.content = codeBlockContent.join('\n');
				codeBlockContent = [];
			} else if (currentSection === 'svgdata') {
				result.svgdata = codeBlockContent.join('\n');
				if(result.svgdata == undefined){result.svgdata = ''}
				codeBlockContent = [];
			}
			continue;
		}

		// Collect content
		if (inCodeBlock) {
			codeBlockContent.push(line);
		} else if (currentSection === 'linkdata' && line.startsWith('- ')) {
			result.linkdata.push(line.replace('- ', '').trim());
		} else if (inYamlHeader) {
			// Parse YAML metadata
			if (line.startsWith('path:')) {
				result.metadata.path = line.split(':')[1].trim();
			} else if (line.startsWith('  -')) {
				result.metadata.tags.push(line.replace('  -', '').trim());
			}
		}
	}

	return result;
}

export const assembleMarkdownText = (obj)=>{
	let result = '---\n';

	// Assemble YAML header
	result += `path: ${obj.metadata.path}\n`;
	result += 'tags:\n';
	for (const tag of obj.metadata.tags) {
		result += `  - ${tag}\n`;
	}
	result += '---\n';

	// Assemble metadata section
	result += '# metadata\n';
	result += '```metadata\n';
	result += obj.metadata.content;
	result += '\n```\n';

	// Assemble svgdata section
	result += '# svgdata\n';
	result += '```svgData\n';
	result += obj.svgdata;
	result += '\n```\n';

	// Assemble linkdata section
	result += '# linkdata\n';
	for (const item of obj.linkdata) {
		result += `- ${item}\n`;
	}

	return result;
}

