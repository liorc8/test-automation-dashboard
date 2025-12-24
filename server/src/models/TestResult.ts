export interface TestResult {
  TESTNAME: string;
  AREA: string;
  PASSED: string;        
  SERVER: string;
  ALMAVERSION: string;
  BUILDNUMBER?: number;
  BUILDDATA?: string;
  LOGLINK?: string;
  SCREENSHOTLINK?: string;
  FAILURETEXT?: string;
  TESTEDON: Date | string;
  TOTALRUNTIME?: number; 
  ENDINGTIMEUNIX?: number;
}