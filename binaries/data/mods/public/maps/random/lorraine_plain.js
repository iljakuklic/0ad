RMS.LoadLibrary("rmgen");

var tGrass = ["temp_grass", "temp_grass", "temp_grass_d"];
var tGrassPForest = "temp_plants_bog";
var tGrassDForest = "temp_plants_bog";
var tGrassA = "temp_grass_plants";
var tGrassB = "temp_plants_bog";
var tGrassC = ["temp_grass_b", "temp_grass_c"];
var tDirt = ["temp_plants_bog", "temp_mud_a"];
var tHill = ["temp_highlands", "temp_grass_long_b"];
var tCliff = ["temp_cliff_a", "temp_cliff_b"];
var tRoad = "temp_road";
var tRoadWild = "temp_road_overgrown";
var tGrassPatch = "temp_grass_plants";
var tShoreBlend = "temp_grass_plants";
var tShore = "temp_plants_bog";
var tWater = "temp_mud_a";

// gaia entities
var oBeech = "gaia/flora_tree_euro_beech";
var oOak = "gaia/flora_tree_oak";
var oBerryBush = "gaia/flora_bush_berry";
var oChicken = "gaia/fauna_chicken";
var oDeer = "gaia/fauna_deer";
var oFish = "gaia/fauna_fish";
var oSheep = "gaia/fauna_rabbit";
var oStoneLarge = "gaia/geology_stonemine_temperate_quarry";
var oStoneSmall = "gaia/geology_stone_temperate";
var oMetalLarge = "gaia/geology_metal_temperate_slabs";
var oWood = "gaia/special_treasure_wood";
var oFood = "gaia/special_treasure_food_bin";
var oMetal = "gaia/special_treasure_metal";
var oStone = "gaia/special_treasure_stone";

// decorative props
var aGrass = "actor|props/flora/grass_soft_small_tall.xml";
var aGrassShort = "actor|props/flora/grass_soft_large.xml";
var aRockLarge = "actor|geology/stone_granite_med.xml";
var aRockMedium = "actor|geology/stone_granite_med.xml";
var aReeds = "actor|props/flora/reeds_pond_lush_a.xml";
var aLillies = "actor|props/flora/water_lillies.xml";
var aBushMedium = "actor|props/flora/bush_medit_me.xml";
var aBushSmall = "actor|props/flora/bush_medit_sm.xml";

var pForestD = [tGrassDForest + TERRAIN_SEPARATOR + oBeech, tGrassDForest];
var pForestP = [tGrassPForest + TERRAIN_SEPARATOR + oOak, tGrassPForest];
const BUILDING_ANGlE = -PI/4;

// initialize map

log("Initializing map...");

InitMap();

var numPlayers = getNumPlayers();
var mapSize = getMapSize();
var mapArea = mapSize*mapSize;

// create tile classes

var clPlayer = createTileClass();
var clHill = createTileClass();
var clForest = createTileClass();
var clWater = createTileClass();
var clDirt = createTileClass();
var clRock = createTileClass();
var clMetal = createTileClass();
var clFood = createTileClass();
var clBaseResource = createTileClass();
var clSettlement = createTileClass();
var clShallow = createTileClass();

// randomize player order
var playerIDs = [];
for (var i = 0; i < numPlayers; i++)
{
	playerIDs.push(i+1);
}
playerIDs = primeSortPlayers(sortPlayers(playerIDs));

// place players

var playerX = new Array(numPlayers);
var playerZ = new Array(numPlayers);
var playerAngle = new Array(numPlayers);
var playerPos = new Array(numPlayers);
var iop = 0;
for (var i = 0; i < numPlayers; i++)
{
	iop = i - 1;
	if (!(numPlayers%2)){
		playerPos[i] = ((iop + abs(iop%2))/2 + 1) / ((numPlayers / 2) + 1);
	}
	else
	{
		if (iop%2)
		{
			playerPos[i] = ((iop + abs(iop%2))/2 + 1) / (((numPlayers + 1) / 2) + 1);
		}
		else
		{
			playerPos[i] = ((iop)/2 + 1) / ((((numPlayers - 1)) / 2) + 1);
		}
	}

	playerZ[i] = 0.25 + 0.5*(i%2);
	playerX[i] = playerPos[i];
}

for (var i = 0; i < numPlayers; i++)
{
	var id = playerIDs[i];
	log("Creating base for player " + id + "...");
	
	// scale radius of player area by map size
	var radius = scaleByMapSize(15,25);
	
	// get the x and z in tiles
	var fx = fractionToTiles(playerX[i]);
	var fz = fractionToTiles(playerZ[i]);
	var ix = round(fx);
	var iz = round(fz);

	// calculate size based on the radius
	var size = PI * radius * radius / 4;
	
	// create the player area
	var placer = new ClumpPlacer(size, 0.9, 0.5, 10, ix, iz);
	createArea(placer, paintClass(clPlayer), null);
	
	// create the city patch
	var cityRadius = 10;
	placer = new ClumpPlacer(PI*cityRadius*cityRadius, 0.6, 0.3, 10, ix, iz);
	var painter = new LayeredPainter([tRoadWild, tRoad], [3]);
	createArea(placer, painter, null);
	
	// create starting units
	placeCivDefaultEntities(fx, fz, id, BUILDING_ANGlE);
	
	// create animals
	for (var j = 0; j < 2; ++j)
	{
		var aAngle = randFloat(0, TWO_PI);
		var aDist = 7;
		var aX = round(fx + aDist * cos(aAngle));
		var aZ = round(fz + aDist * sin(aAngle));
		var group = new SimpleGroup(
			[new SimpleObject(oChicken, 5,5, 0,3)],
			true, clBaseResource, aX, aZ
		);
		createObjectGroup(group, 0);
	}
	
	// create berry bushes
	var bbAngle = randFloat(0, TWO_PI);
	var bbDist = 12;
	var bbX = round(fx + bbDist * cos(bbAngle));
	var bbZ = round(fz + bbDist * sin(bbAngle));
	group = new SimpleGroup(
		[new SimpleObject(oBerryBush, 5,5, 0,3)],
		true, clBaseResource, bbX, bbZ
	);
	createObjectGroup(group, 0);
	
	// create metal mine
	var mAngle = bbAngle;
	while(abs(mAngle - bbAngle) < PI/3)
	{
		mAngle = randFloat(0, TWO_PI);
	}
	var mDist = 11;
	var mX = round(fx + mDist * cos(mAngle));
	var mZ = round(fz + mDist * sin(mAngle));
	group = new SimpleGroup(
		[new SimpleObject(oMetalLarge, 1,1, 0,0), new SimpleObject(aGrass, 2,4, 0,2)],
		true, clBaseResource, mX, mZ
	);
	createObjectGroup(group, 0);
	
	// create stone mines
	mAngle += randFloat(PI/8, PI/4);
	mX = round(fx + mDist * cos(mAngle));
	mZ = round(fz + mDist * sin(mAngle));
	group = new SimpleGroup(
		[new SimpleObject(oStoneLarge, 1,1, 0,2), new SimpleObject(aGrass, 2,4, 0,2)],
		true, clBaseResource, mX, mZ
	);
	createObjectGroup(group, 0);
	
	// create starting trees
	var num = 3;
	var tAngle = randFloat(-PI/3, 4*PI/3);
	var tDist = randFloat(11, 13);
	var tX = round(fx + tDist * cos(tAngle));
	var tZ = round(fz + tDist * sin(tAngle));
	group = new SimpleGroup(
		[new SimpleObject(oOak, num, num, 0,5)],
		false, clBaseResource, tX, tZ
	);
	createObjectGroup(group, 0, avoidClasses(clBaseResource,2));
}

// create the main river
log("Creating the main river");
var tang = randFloat(0, TWO_PI);
var placer = new PathPlacer(1, fractionToTiles(0.5), fractionToTiles(0.99), fractionToTiles(0.5), scaleByMapSize(10,20), 0.5, 3*(scaleByMapSize(1,4)), 0.1, 0.01);
var terrainPainter = new LayeredPainter(
	[tShore, tWater, tWater],		// terrains
	[1, 3]								// widths
);
var elevationPainter = new SmoothElevationPainter(
	ELEVATION_SET,			// type
	-4,				// elevation
	4				// blend radius
);
createArea(placer, [terrainPainter, elevationPainter], avoidClasses(clPlayer, 4));

placer = new ClumpPlacer(floor(PI*scaleByMapSize(10,20)*scaleByMapSize(10,20)/4), 0.95, 0.6, 10, 1, fractionToTiles(0.5));
var painter = new LayeredPainter([tWater, tWater], [1]);
var elevationPainter = new SmoothElevationPainter(ELEVATION_SET, -4, 2);
createArea(placer, [painter, elevationPainter], avoidClasses(clPlayer, 8));

placer = new ClumpPlacer(floor(PI*scaleByMapSize(10,20)*scaleByMapSize(10,20)/4), 0.95, 0.6, 10, fractionToTiles(0.99), fractionToTiles(0.5));
var painter = new LayeredPainter([tWater, tWater], [1]);
var elevationPainter = new SmoothElevationPainter(ELEVATION_SET, -4, 2);
createArea(placer, [painter, elevationPainter], avoidClasses(clPlayer, 8));

// create the shallows of the main river
log("Creating the shallows of the main river");

for (var i = 0; i <= randInt(3, scaleByMapSize(4,6)); i++)
{
	var cLocation = randFloat(0.15,0.85);
	passageMaker(fractionToTiles(cLocation), fractionToTiles(0.35), fractionToTiles(cLocation), fractionToTiles(0.65), scaleByMapSize(4,8), -2, -2, 2, clShallow, undefined, -4);
}

// create tributaries
log("Creating tributaries");

for (var i = 0; i <= randInt(8, (scaleByMapSize(12,20))); i++)
{
	var cLocation = randFloat(0.05,0.95);
	var tang = randFloat(PI*0.2, PI*0.8)*((randInt(2)-0.5)*2);
	if (tang > 0)
	{
		var cDistance = 0.05;
	}
	else
	{
		var cDistance = -0.05;
	}
	var point = getTIPIADBON([fractionToTiles(cLocation), fractionToTiles(0.5 + cDistance)], [fractionToTiles(cLocation), fractionToTiles(0.5 - cDistance)], [-6, -1.5], 0.5, 4, 0.01);
	if (point !== undefined)
	{
		var placer = new PathPlacer(floor(point[0]), floor(point[1]), floor(fractionToTiles(0.5 + 0.49*cos(tang))), floor(fractionToTiles(0.5 + 0.49*sin(tang))), scaleByMapSize(10,20), 0.4, 3*(scaleByMapSize(1,4)), 0.1, 0.05);
		var terrainPainter = new LayeredPainter(
			[tShore, tWater, tWater],		// terrains
			[1, 3]								// widths
		);
		var elevationPainter = new SmoothElevationPainter(
			ELEVATION_SET,			// type
			-4,				// elevation
			4				// blend radius
		);
		var success = createArea(placer, [terrainPainter, elevationPainter, paintClass(clWater)], avoidClasses(clPlayer, 3, clWater, 3, clShallow, 2));
		if (success !== undefined)
		{
			placer = new ClumpPlacer(floor(PI*scaleByMapSize(10,20)*scaleByMapSize(10,20)/4), 0.95, 0.6, 10, fractionToTiles(0.5 + 0.49*cos(tang)), fractionToTiles(0.5 + 0.49*sin(tang)));
			var painter = new LayeredPainter([tWater, tWater], [1]);
			var elevationPainter = new SmoothElevationPainter(ELEVATION_SET, -4, 2);
			createArea(placer, [painter, elevationPainter], avoidClasses(clPlayer, 15));
		}
	}
}

passageMaker(fractionToTiles(0.2), fractionToTiles(0.25), fractionToTiles(0.8), fractionToTiles(0.25), scaleByMapSize(4,8), -2, -2, 2, clShallow, undefined, -4);
passageMaker(fractionToTiles(0.2), fractionToTiles(0.75), fractionToTiles(0.8), fractionToTiles(0.75), scaleByMapSize(4,8), -2, -2, 2, clShallow, undefined, -4);

paintTerrainBasedOnHeight(-5, 2, 1, tWater);
paintTileClassBasedOnHeight(-6, 0.5, 1, clWater)

RMS.SetProgress(50);

// create bumps
log("Creating bumps...");
placer = new ClumpPlacer(scaleByMapSize(20, 50), 0.3, 0.06, 1);
painter = new SmoothElevationPainter(ELEVATION_MODIFY, 2, 2);
createAreas(
	placer,
	painter, 
	avoidClasses(clWater, 2, clPlayer, 7),
	scaleByMapSize(100, 200)
);

RMS.SetProgress(55);

// calculate desired number of trees for map (based on size)
const MIN_TREES = 500;
const MAX_TREES = 2500;
const P_FOREST = 0.7;

var totalTrees = scaleByMapSize(MIN_TREES, MAX_TREES);
var numForest = totalTrees * P_FOREST;
var numStragglers = totalTrees * (1.0 - P_FOREST);

// create forests
log("Creating forests...");
var types = [
	[[tGrassDForest, tGrass, pForestD], [tGrassDForest, pForestD]],
	[[tGrassPForest, tGrass, pForestP], [tGrassPForest, pForestP]]
];	// some variation
var size = numForest / (scaleByMapSize(2,8) * numPlayers);
var num = floor(size / types.length);
for (var i = 0; i < types.length; ++i)
{
	placer = new ClumpPlacer(numForest / num, 0.1, 0.1, 1);
	painter = new LayeredPainter(
		types[i],		// terrains
		[2]											// widths
		);
	createAreas(
		placer,
		[painter, paintClass(clForest)], 
		avoidClasses(clPlayer, 6, clWater, 3, clForest, 8, clHill, 1),
		num
	);
}

RMS.SetProgress(70);

// create dirt patches
log("Creating dirt patches...");
var sizes = [scaleByMapSize(3, 48), scaleByMapSize(5, 84), scaleByMapSize(8, 128)];
for (var i = 0; i < sizes.length; i++)
{
	placer = new ClumpPlacer(sizes[i], 0.3, 0.06, 0.5);
	painter = new LayeredPainter(
		[[tGrass,tGrassA],[tGrassA,tGrassB], [tGrassB,tGrassC]], 		// terrains
		[1,1]															// widths
	);
	createAreas(
		placer,
		[painter, paintClass(clDirt)],
		avoidClasses(clWater, 1, clForest, 0, clHill, 0, clPlayer, 6),
		scaleByMapSize(15, 45)
	);
}

RMS.SetProgress(75);

// create grass patches
log("Creating grass patches...");
var sizes = [scaleByMapSize(2, 32), scaleByMapSize(3, 48), scaleByMapSize(5, 80)];
for (var i = 0; i < sizes.length; i++)
{
	placer = new ClumpPlacer(sizes[i], 0.3, 0.06, 0.5);
	painter = new TerrainPainter(tGrassPatch);
	createAreas(
		placer,
		painter,
		avoidClasses(clWater, 1, clForest, 0, clHill, 0, clPlayer, 6),
		scaleByMapSize(15, 45)
	);
}

RMS.SetProgress(80);

log("Creating stone mines...");
// create large stone quarries
group = new SimpleGroup([new SimpleObject(oStoneSmall, 0,2, 0,4), new SimpleObject(oStoneLarge, 1,1, 0,4)], true, clRock);
createObjectGroups(group, 0,
	[avoidClasses(clWater, 0, clForest, 1, clPlayer, 8, clRock, 10, clHill, 1)],
	scaleByMapSize(4,16), 100
);

// create small stone quarries
group = new SimpleGroup([new SimpleObject(oStoneSmall, 2,5, 1,3)], true, clRock);
createObjectGroups(group, 0,
	[avoidClasses(clWater, 0, clForest, 1, clPlayer, 8, clRock, 10, clHill, 1)],
	scaleByMapSize(4,16), 100
);

log("Creating metal mines...");
// create large metal quarries
group = new SimpleGroup([new SimpleObject(oMetalLarge, 1,1, 0,4)], true, clMetal);
createObjectGroups(group, 0,
	[avoidClasses(clWater, 0, clForest, 1, clPlayer, 8, clMetal, 10, clRock, 5, clHill, 1)],
	scaleByMapSize(4,16), 100
);

RMS.SetProgress(86);

// create small decorative rocks
log("Creating small decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockMedium, 1,3, 0,1)],
	true
);
createObjectGroups(
	group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 0, clHill, 0),
	scaleByMapSize(16, 262), 50
);


// create large decorative rocks
log("Creating large decorative rocks...");
group = new SimpleGroup(
	[new SimpleObject(aRockLarge, 1,2, 0,1), new SimpleObject(aRockMedium, 1,3, 0,2)],
	true
);
createObjectGroups(
	group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 0, clHill, 0),
	scaleByMapSize(8, 131), 50
);


// create deer
log("Creating deer...");
group = new SimpleGroup(
	[new SimpleObject(oDeer, 5,7, 0,4)],
	true, clFood
);
createObjectGroups(group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 1, clHill, 1, clFood, 20),
	3 * numPlayers, 50
);


// create sheep
log("Creating sheep...");
group = new SimpleGroup(
	[new SimpleObject(oSheep, 2,3, 0,2)],
	true, clFood
);
createObjectGroups(group, 0,
	avoidClasses(clWater, 0, clForest, 0, clPlayer, 6, clHill, 1, clFood, 20),
	3 * numPlayers, 50
);

// create straggler trees
log("Creating straggler trees...");
var types = [oOak, oBeech];	// some variation
var num = floor(numStragglers / types.length);
for (var i = 0; i < types.length; ++i)
{
	group = new SimpleGroup(
		[new SimpleObject(types[i], 1,1, 0,3)],
		true, clForest
	);
	createObjectGroups(group, 0,
		avoidClasses(clWater, 1, clForest, 1, clHill, 1, clPlayer, 5, clMetal, 1, clRock, 1),
		num
	);
}

//create small grass tufts
log("Creating small grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrassShort, 1,2, 0,1, -PI/8,PI/8)]
);
createObjectGroups(group, 0,
	avoidClasses(clWater, 2, clHill, 2, clPlayer, 2, clDirt, 0),
	scaleByMapSize(13, 200)
);


// create large grass tufts
log("Creating large grass tufts...");
group = new SimpleGroup(
	[new SimpleObject(aGrass, 2,4, 0,1.8, -PI/8,PI/8), new SimpleObject(aGrassShort, 3,6, 1.2,2.5, -PI/8,PI/8)]
);
createObjectGroups(group, 0,
	avoidClasses(clWater, 3, clHill, 2, clPlayer, 2, clDirt, 1, clForest, 0),
	scaleByMapSize(13, 200)
);


// create bushes
log("Creating bushes...");
group = new SimpleGroup(
	[new SimpleObject(aBushMedium, 1,2, 0,2), new SimpleObject(aBushSmall, 2,4, 0,2)]
);
createObjectGroups(group, 0,
	avoidClasses(clWater, 1, clHill, 1, clPlayer, 1, clDirt, 1),
	scaleByMapSize(13, 200), 50
);

// create shallow flora
log("Creating shallow flora...");
group = new SimpleGroup(
	[new SimpleObject(aLillies, 1,2, 0,2), new SimpleObject(aReeds, 2,4, 0,2)]
);
createObjectGroups(group, 0,
	stayClasses(clShallow, 1),
	60 * scaleByMapSize(13, 200), 80
);

// Set environment
setSkySet("cirrus");
setWaterTint(0.447, 0.412, 0.322);				// muddy brown
setWaterReflectionTint(0.447, 0.412, 0.322);	// muddy brown
setWaterMurkiness(1.0);
setWaterReflectionTintStrength(0.677);

// Export map data
ExportMap();