import test from "node:test";
import assert from "node:assert/strict";
import {allowsAnime4k,isMobileAnime4kMode,checkMobileDimensions,anime4kQualityPreference,mobileSubmissionTooSlow} from "../src/utils/anime4kPolicy.js";
test("Android uses its own profiles and iOS is left unsupported",()=>{
 assert.equal(allowsAnime4k({isMobile:true,os:"android"}),true);assert.equal(allowsAnime4k({isMobile:true,os:"ios"}),false);assert.equal(allowsAnime4k({isMobile:false,os:"win32"}),true);
 assert.equal(isMobileAnime4kMode("mobile-s"),true);assert.equal(isMobileAnime4kMode("mobile-m"),true);assert.equal(isMobileAnime4kMode("a"),false);
});
test("mobile upscaling honors portrait and landscape resolution budgets without silently reducing the source",()=>{
 assert.deepEqual(checkMobileDimensions(1280,720,"mobile-s"),{ok:true,width:2560,height:1440});assert.equal(checkMobileDimensions(720,1280,"mobile-s").ok,true);
 assert.equal(checkMobileDimensions(1920,1080,"mobile-s").ok,false);assert.deepEqual(checkMobileDimensions(1920,1080,"mobile-m"),{ok:true,width:3840,height:2160});
 assert.equal(checkMobileDimensions(3840,2160,"mobile-m").ok,false);assert.equal(checkMobileDimensions(0,0,"mobile-s").ok,false);
});
test("mobile input quality is capped independently from the PC setting",()=>{
 assert.equal(anime4kQualityPreference({anime4kMode:"mobile-s",anime4kMobileQuality:"1080",anime4kQuality:"max"}),"720");
 assert.equal(anime4kQualityPreference({anime4kMode:"mobile-m",anime4kMobileQuality:"1080"}),"1080");assert.equal(anime4kQualityPreference({anime4kMode:"a",anime4kQuality:"max"}),"max");
});
test("a sustained slow renderer falls back, isolated slow frames do not",()=>{
 assert.equal(mobileSubmissionTooSlow([60,60,60]),false);assert.equal(mobileSubmissionTooSlow([5,6,8,9,100,110,5,8]),false);assert.equal(mobileSubmissionTooSlow([60,50,80,90,100,110,20,30]),true);
});
