#!/usr/bin/env python
# histogram equalization
# http://programmingcomputervision.com/downloads/ProgrammingComputerVision_CCdraft.pdf

from numpy import *
from PIL import Image, ImageEnhance, ImageOps

import operator

# http://www.janeriksolem.net/2009/06/histogram-equalization-with-python-and.html
def histeq(im,nbr_bins=256):
	"""  Histogram equalization of a grayscale image. """

	# get image histogram
	imhist,bins = histogram(im.flatten(),nbr_bins,normed=True)
	cdf = imhist.cumsum() # cumulative distribution function
	cdf = 255 * cdf / cdf[-1] # normalize

	# use linear interpolation of cdf to find new pixel values
	im2 = interp(im.flatten(),bins[:-1],cdf)

	pil_im = Image.fromarray(uint8(im2.reshape(im.shape)))
	return pil_im, cdf


def equalize_preserve_hue(im):
	# convert to grayscale
    g = im.convert('L')
    h = g.histogram()
    lut = []
    for b in range(0, len(h), 256):
        # step size
        step = reduce(operator.add, h[b:b+256]) / 255
        # create equalization lookup table
        n = 0
        for i in range(256):
            lut.append(n / step)
            n = n + h[i+b]
    # map image through lookup table
    return im.point(lut*4)
	
# PIL http://effbot.org/zone/pil-histogram-equalization.htm
def equalize(im):

    h 	= im.histogram()
    lut = []
    for b in range(0, len(h), 256):
        # step size
        step = reduce(operator.add, h[b:b+256]) / 255
        
        # create equalization lookup table
        n = 0
        for i in range(256):
            lut.append(n / step)
            n = n + h[i+b]
    
    return im.point(lut)

def method1(im):
	# PIL histogram equalization
	# calculate lookup table
	im2 = equalize(im)
	im2.save("test_m1.png")

# http://stackoverflow.com/questions/7116113/normalize-histogram-brightness-and-contrast-of-a-set-of-images-using-python-im
def method2(im):
	im2 = equalize_preserve_hue(im)
	im2.save("test_m2.png")

def method3(im):
	# equalizes bands individually
	r,g,b,a = im.split()
	r = ImageOps.equalize(r)
	g = ImageOps.equalize(g)
	b = ImageOps.equalize(b)
	im_eq = Image.merge('RGBA', (r,g,b,a))
	im_eq.save("test_m3.png")

# simple contrast
def method4(im):
	enh1 	= ImageEnhance.Brightness(im)
	im2 	= enh1.enhance(1.5)
	
	enh2 	= ImageEnhance.Contrast(im2)
	im3 	= enh2.enhance(1.2)

	enh3 	= ImageEnhance.Sharpness(im3)
	im4 	= enh3.enhance(1.0)
	
	im4.save("test_m4.png")
	
def method5(im):
	im2,cdf = histeq(array(im.convert('L')))
	im2.save("test_m5.png")
	
def method6(im):
	r,g,b,a = im.split()
	r = ImageOps.autocontrast(r, cutoff = 2)		
	g = ImageOps.autocontrast(g, cutoff = 2)		
	b = ImageOps.autocontrast(b, cutoff = 2)		
	im3 = Image.merge('RGBA', (r,g,b,a))
	
	enh3 	= ImageEnhance.Sharpness(im3)
	im4 	= enh3.enhance(2.0)
	
	im4.save("test_m6.tif")
	
if __name__ == "__main__":
	
	fname = "/Users/patricecappelaere/Development/menatraining/menatraining/data/eo1_ali/EO1A0090472014197110P0_SG1_01/EO1A0090472014197110P0_COMPOSITE_542.tif"
	
	im = Image.open(fname)
	
	#method1(im)
	#method2(im)
	#method3(im)
	#method4(im)
	#method5(im)
	method6(im)
	