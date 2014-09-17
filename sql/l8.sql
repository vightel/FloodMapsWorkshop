-- ----------------------------
--  Table structure for l8
-- ----------------------------
DROP TABLE IF EXISTS "public"."l8";
CREATE TABLE "public"."l8" (
	"id" int8,
	"scene" text COLLATE "default",
	"date" date,
	"center_lat" float4,
	"center_lon" float4,
	"geom" "public"."geometry"
)
WITH (OIDS=FALSE);

-- ----------------------------
--  Indexes structure for table l8
-- ----------------------------
CREATE INDEX  "l8_scene_index" ON "public"."l8" USING btree(scene COLLATE "default" ASC NULLS LAST);
CREATE INDEX  "l8_spatial_index" ON "public"."l8" USING gist(geom);

/*
ALTER TABLE "public"."l8" OWNER TO "osm_admin";
*/


