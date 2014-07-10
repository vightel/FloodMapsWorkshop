#!/usr/bin/env python

#
#	This is to generate an OSM Water Reference Image
#	This is based on Mapnik code
#	This code has been seriously hacked by Pat Cappealere pat@cappelaere.con
#

import mapnik

import sys, os
import argparse

merc 		= "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs +over"
latlon		= "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs"

# ensure minimum mapnik version
if not hasattr(mapnik,'mapnik_version') and not mapnik.mapnik_version() >= 600:
    raise SystemExit('This script requires Mapnik >=0.6.0)')

# ========================================================================
# generate_image.py --mapfile water.xml --bbox -72.7738 18.0985 -72.1611 18.7072 --name water_image.png
# generate_image.py --mapfile osm.xml --bbox -72.7738 18.0985 -72.1611 18.7072 --name osm_image.png
# generate_image.py --mapfile water.xml --bbox -75.0 17.0 -70.0 20.0 --name n15w075_water_image.png
# generate_image.py --mapfile water.xml --bbox -74.9995833 16.999583 -69.9995833 19.999583 --name n15w075_water_image.tif
# generate_image.py --mapfile water.xml --bbox -72.5 18.0 -71.5 19.0 --name port_au_prince_water_image.png
# change black to transparent
# convert -transparent black image.png osm_water.png

if __name__ == "__main__":
    try:
        mapfile = os.environ['MAPNIK_MAP_FILE']
    except KeyError:
        mapfile = "osm.xml"

	parser = argparse.ArgumentParser(description='Generate OSM Image based on stylesheet')
	apg_input = parser.add_argument_group('Input')
	apg_input.add_argument("-b", "--bbox", nargs=4, type=float, metavar=('X1', 'Y1', 'X2', 'Y2'), help="generate tiles inside a bounding box")
	apg_input.add_argument("-m", "--mapfile", help="OSM Map File")
	apg_input.add_argument("-i", "--img", nargs=2, type=int, metavar=('dx','dy'), help="output image size in pixels")
	apg_input.add_argument("-v", "--verbose", action='store_true', help="Verbose Flag")
	apg_input.add_argument("-f", "--force", action='store_true', help="Force Flag")

	apg_output = parser.add_argument_group('Output')
	apg_output.add_argument('--name', help='name for outputfile', default='image.png')

	options = parser.parse_args()

	mapfile 	= options.mapfile
	bounds 		= options.bbox
	img			= options.img
	verbose		= options.verbose
	force		= options.force
	
	if verbose:
		print "mapfile:", mapfile
		print "bounds:", bounds
		print "output img pixels:", img[0], img[1]

	map_uri = options.name
	m 		= mapnik.Map(img[0], img[1])
	
	mapnik.load_map(m, mapfile)
	
	# Override projection defined in mapfile    
	m.srs 	= latlon
	#m.srs 	= merc
	
	# Calculate projected boundaries
	prj 	= mapnik.Projection(m.srs)
	c0 		= prj.forward(mapnik.Coord(bounds[0], bounds[1]))
	c1 		= prj.forward(mapnik.Coord(bounds[2], bounds[3]))

	# Apply bounding box
	bbox 	= mapnik.Envelope(c0.x, c0.y, c1.x, c1.y)
	m.zoom_to_box(bbox)

	# Render image
	im 		= mapnik.Image(img[0], img[1])
	mapnik.render(m, im)
	
	view 	= im.view(0, 0, img[0], img[1])
	
	if force or not os.path.isfile(map_uri):
		if verbose:
			print( "saving "+ map_uri)
		view.save(map_uri)
		
	if verbose:
		print 'output image to %s!\n' % map_uri
		
    # Note: instead of creating an image, rendering to it, and then 
    # saving, we can also do this in one step like:
    # mapnik.render_to_file(m, map_uri,'png')
    
    # And in Mapnik >= 0.7.0 you can also use `render_to_file()` to output
    # to Cairo supported formats if you have Mapnik built with Cairo support
    # For example, to render to pdf or svg do:
    # mapnik.render_to_file(m, "image.pdf")
    #mapnik.render_to_file(m, "image.svg")
