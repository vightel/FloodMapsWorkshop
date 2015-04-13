import os, inspect, sys, math, pprint

pp = pprint.PrettyPrinter(indent=4)

def hex_to_rgb(value):
	value += "ff"	# for alpha
	value = value.lstrip('#')
	lv = len(value)
	return tuple(int(value[i:i + lv // 4], 16) for i in range(0, lv, lv // 4))


def MakeBrowseImage(levels, hexColors):
	decColors = []
	for h in hexColors:
		rgb = hex_to_rgb(h)
		decColors.append(rgb)
	
	pp.pprint(decColors)

	# get first item
	
	firstItem 	= levels.pop()
	lastItem 	= levels.pop(0)

	rlist		= reversed(levels)	
	print "first Item", 0, firstItem
	
	for idx, l in enumerate(rlist):
		print idx+1, firstItem, l
		firstItem = l
	
	idx += 2
	print idx, l, lastItem
	print idx+1, lastItem
			
	

# ===============================
# Main
#
# python makebrowseimage.py 

if __name__ == '__main__':
	
	# Testing
	levels 	= [1440, 890, 550, 340, 210, 130, 80, 50, 30, 20, 10]
		
	# From http://colorbrewer2.org/
	hexColors = [
		"#f7fcf0",
		"#e0f3db",
		"#ccebc5",
		"#a8ddb5",
		"#7bccc4",
		"#4eb3d3",
		"#2b8cbe",
		"#0868ac",
		"#084081",
		"#810F7C",
		"#4D004A"
	]
	#MakeBrowseImage(ds, browse_filename, subset_filename, osm_bg_image, sw_osm_image, levels, hexColors)
	MakeBrowseImage(levels, hexColors)
	