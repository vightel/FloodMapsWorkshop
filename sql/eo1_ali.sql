-- ----------------------------
--  Table structure for eo1_ali
-- ----------------------------
DROP TABLE IF EXISTS "public"."eo1_ali";
CREATE TABLE "public"."eo1_ali" (
	"id" int8,
	"scene" text COLLATE "default",
	"date" date,
	"center_lat" float4,
	"center_lon" float4,
	"geom" "public"."geometry"
)
WITH (OIDS=FALSE);

/*
ALTER TABLE "public"."eo1_ali" OWNER TO "osm_admin";
*/

-- ----------------------------
--  Indexes structure for table eo1_ali
-- ----------------------------
CREATE INDEX  "eo1_ali_spatial_index" ON "public"."eo1_ali" USING gist(geom);
CREATE INDEX  "eo1_scene_index" ON "public"."eo1_ali" USING btree(scene COLLATE "default" ASC NULLS LAST);

