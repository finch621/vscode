import { DiffHunk } from './models/diffHunk';
import { getDiffChangeType, DiffLine, DiffChangeType } from './models/diffLine';
export const DIFF_HUNK_HEADER = /@@ \-(\d+)(,(\d+))?( \+(\d+)(,(\d+)?))? @@/;
export function countCarriageReturns(text: string): number {
	let count = 0;
	let index = 0;
	while ((index = text.indexOf('\r', index)) !== -1) {
		index++;
		count++;
	}

	return count;
}

export function* LineReader(text: string): IterableIterator<string> {
	let index = 0;

	while (index !== -1 && index < text.length) {
		let startIndex = index;
		index = text.indexOf('\n', index);
		let endIndex = index !== -1 ? index : text.length;
		let length = endIndex - startIndex;

		if (index !== -1) {
			if (index > 0 && text[index - 1] === '\r') {
				length--;
			}

			index++;
		}

		yield text.substr(startIndex, length);
	}
}

export function* parseDiffHunk(diffHunkPatch: string): IterableIterator<DiffHunk> {
	let lineReader = LineReader(diffHunkPatch);

	let itr = lineReader.next();
	let diffHunk: DiffHunk = null;
	let diffLine = -1;
	let oldLine = -1;
	let newLine = -1;

	while (!itr.done) {
		let line = itr.value;
		if (DIFF_HUNK_HEADER.test(line)) {
			if (diffHunk) {
				yield diffHunk;
				diffHunk = null;
			}

			if (diffLine === -1) {
				diffLine = 0;
			}

			let matches = DIFF_HUNK_HEADER.exec(line);
			let oriStartLine = oldLine = Number(matches[1]);
			let oriLen = Number(matches[3]) | 0;
			let newStartLine = newLine = Number(matches[5]);
			let newLen = Number(matches[7]) | 0;

			diffHunk = new DiffHunk(oriStartLine, oriLen, newStartLine, newLen, diffLine);
		} else if (diffHunk !== null) {
			let type = getDiffChangeType(line[0]);

			if (type !== DiffChangeType.Control) {
				diffHunk.Lines.push(new DiffLine(type, type !== DiffChangeType.Add ? oldLine : -1,
					type !== DiffChangeType.Delete ? newLine : -1,
					diffLine,
					line
				));

				var lineCount = 1;
				lineCount += countCarriageReturns(line);

				switch (type) {
					case DiffChangeType.None:
						oldLine += lineCount;
						newLine += lineCount;
						break;
					case DiffChangeType.Delete:
						oldLine += lineCount;
						break;
					case DiffChangeType.Add:
						newLine += lineCount;
						break;
				}
			}
		}
		if (diffLine !== -1) {
			++diffLine;
		}
		itr = lineReader.next();
	}

	if (diffHunk) {
		yield diffHunk;
	}
}

export function getDiffLineByPosition(prPatch: string, diffLineNumber: number): DiffLine {
	let prDiffReader = parseDiffHunk(prPatch);
	let prDiffIter = prDiffReader.next();

	while (!prDiffIter.done) {
		let diffHunk = prDiffIter.value;
		for (let i = 0; i < diffHunk.Lines.length; i++) {
			if (diffHunk.Lines[i].diffLineNumber === diffLineNumber) {
				return diffHunk.Lines[i];
			}
		}

		prDiffIter = prDiffReader.next();
	}

	return null;
}

export function mapHeadLineToDiffHunkPosition(prPatch: string, localDiff: string, line: number): number {
	let delta = 0;

	let localDiffReader = parseDiffHunk(localDiff);
	let localDiffIter = localDiffReader.next();
	let lineInPRDiff = line;

	while (!localDiffIter.done) {
		let diffHunk = localDiffIter.value;
		if (diffHunk.newLineNumber + diffHunk.newLength - 1 < line) {
			delta += diffHunk.oldLength - diffHunk.newLength;
		} else {
			lineInPRDiff = line + delta;
			break;
		}

		localDiffIter = localDiffReader.next();
	}

	let prDiffReader = parseDiffHunk(prPatch);
	let prDiffIter = prDiffReader.next();

	let positionInDiffHunk = -1;

	while (!prDiffIter.done) {
		let diffHunk = prDiffIter.value;
		if (diffHunk.newLineNumber <= lineInPRDiff && diffHunk.newLineNumber + diffHunk.newLength - 1 >= lineInPRDiff) {
			positionInDiffHunk = lineInPRDiff - diffHunk.newLineNumber + diffHunk.diffLine + 1;
			break;
		}

		prDiffIter = prDiffReader.next();
	}

	return positionInDiffHunk;
}

export function mapOldPositionToNew(patch: string, line: number): number {
	let diffReader = parseDiffHunk(patch);
	let diffIter = diffReader.next();

	let delta = 0;
	while (!diffIter.done) {
		let diffHunk = diffIter.value;

		if (diffHunk.oldLineNumber > line) {
			continue;
		} else if (diffHunk.oldLineNumber + diffHunk.oldLength - 1 < line) {
			delta = diffHunk.newLength - diffHunk.oldLength;
		} else {
			return line + delta;
		}

		diffIter = diffReader.next();
	}

	return line + delta;
}
	let diffHunkReader = parseDiffHunk(patch);
	let diffHunkIter = diffHunkReader.next();
	while (!diffHunkIter.done) {
		let diffHunk = diffHunkIter.value;
		let oriStartLine = diffHunk.oldLineNumber;

		for (let j = lastCommonLine + 1; j < oriStartLine; j++) {
			right.push(left[j - 1]);
		}

		lastCommonLine = oriStartLine + diffHunk.oldLength - 1;

		for (let j = 0; j < diffHunk.Lines.length; j++) {
			let diffLine = diffHunk.Lines[j];
			if (diffLine.type === DiffChangeType.Delete) {
			} else if (diffLine.type === DiffChangeType.Add) {
				right.push(diffLine.content.substr(1));
			} else {
				let codeInFirstLine = diffLine.content.substr(1);
				right.push(codeInFirstLine);

		diffHunkIter = diffHunkReader.next();
export function mapCommentsToHead(prPatch: string, localDiff: string, comments: Comment[]) {
		let diffLine = getDiffLineByPosition(prPatch, comment.position);
		let positionInPr = diffLine.newLineNumber;
		let newPosition = mapOldPositionToNew(localDiff, positionInPr);
		comment.absolutePosition = newPosition;