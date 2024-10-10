export function paginate(arr: string[], elemCount: number, page: number = 1, sep: string = "\n") {
	// Clamp the element count to be above 1 and ensure its an integer.
	elemCount = math.clamp(math.floor(elemCount), 1, math.huge);
	// Clamp the page index to be within 1 to # of pages
	page = math.clamp(math.floor(page), 1, math.clamp(arr.size().idiv(elemCount), 1, math.huge));
	return (
		// Remove elements greater than (page * elemCount) and remove elements less than ((page - 1) * elemCount)
		// This only gives us the elements within the current page.
		arr.filter((_, i) => i < page * elemCount && i > (page - 1) * elemCount).join(sep) +
		`\n(Page ${page} / ${math.clamp(arr.size().idiv(elemCount), 1, math.huge)})`
	);
}
