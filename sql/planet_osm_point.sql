/*
 Navicat Premium Data Transfer

 Source Server         : localhost:5432
 Source Server Type    : PostgreSQL
 Source Server Version : 90303
 Source Host           : localhost
 Source Database       : dk
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90303
 File Encoding         : utf-8

 Date: 08/25/2014 15:39:38 PM
*/

-- ----------------------------
--  Table structure for planet_osm_point
-- ----------------------------
DROP TABLE IF EXISTS "public"."planet_osm_point";
CREATE TABLE "public"."planet_osm_point" (
	"id" int8 NOT NULL DEFAULT nextval('landslide_seq'::regclass),
	"date" text COLLATE "default",
	"time" text COLLATE "default",
	"country" text COLLATE "default",
	"nearest_places" text COLLATE "default",
	"hazard_type" text COLLATE "default",
	"landslide_type" text COLLATE "default",
	"trigger" text COLLATE "default",
	"storm_name" text COLLATE "default",
	"fatalities" int4,
	"injuries" int4,
	"source_name" text COLLATE "default",
	"source_link" text COLLATE "default",
	"comments" text COLLATE "default",
	"location_description" text COLLATE "default",
	"location_accuracy" text COLLATE "default",
	"landslide_size" text COLLATE "default",
	"photos_link" text COLLATE "default",
	"way" "public"."geometry",
	"cat_src" text COLLATE "default",
	"cat_id" int4,
	"countryname" text COLLATE "default",
	"near" text COLLATE "default",
	"distance" float8,
	"adminname1" text COLLATE "default",
	"adminname2" text COLLATE "default",
	"adminname3" text COLLATE "default",
	"population" int4,
	"tz" text COLLATE "default",
	"countrycode" text COLLATE "default",
	"continentcode" text COLLATE "default",
	"key" text COLLATE "default",
	"version" int4,
	"user_id" int4,
	"tstamp" timestamp(6) NULL,
	"changeset_id" int8,
	"github" text COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."planet_osm_point" OWNER TO "postgres";

-- ----------------------------
--  Primary key structure for table planet_osm_point
-- ----------------------------
ALTER TABLE "public"."planet_osm_point" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Indexes structure for table planet_osm_point
-- ----------------------------
CREATE INDEX  "planet_osm_point_index" ON "public"."planet_osm_point" USING gist(way) WITH (FILLFACTOR=100, BUFFERING=NO);

