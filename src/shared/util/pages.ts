//!native
export function paginate(arr: string[], elemCount: number, page: number = 1, sep: string = "\n") {
	// Clamp the element count to be above 1 and ensure its an integer.
	elemCount = math.clamp(math.floor(elemCount), 1, math.huge);
	const maxPageCount = math.clamp(math.ceil(arr.size() / elemCount), 1, math.huge);
	// Clamp the page index to be within 1 to # of pages
	page = math.clamp(page.idiv(1), 1, maxPageCount);
	return (
		// Remove elements greater than (page * elemCount) and remove elements less than ((page - 1) * elemCount)
		// This only gives us the elements within the current page.
		// Keep in mind the actual index here is 0, so we need to account for the 0 index in the second condition.
		arr.filter((_, i) => i < page * elemCount && i + 1 > (page - 1) * elemCount).join(sep) +
		// arr.join(sep) + //
		`\n(Page ${page} / ${maxPageCount})`
	);
}
