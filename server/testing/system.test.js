/**
 * System Tests for Swap-Shop
 * This test should test adding items, loading the home page, and reserve an item
 * and return exeptions if any issues.
 *
 *
 * 
 */

const request = require("supertest");
const fs = require("fs");
const path = require("path");


const app = require("../app");   


const ITEMS_FILE = path.join(__dirname, "..", "items.xlsx");

function resetItemsFile() {
    if (fs.existsSync(ITEMS_FILE)) fs.unlinkSync(ITEMS_FILE);
}

describe("Swap-Shop System Tests", () => {

    beforeEach(() => {
        resetItemsFile();
    });

    test("Home page loads successfully", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("Swap Shop"); 
    });

    test("Can submit a donated item", async () => {
        const res = await request(app)
            .post("/submit-item")
            .field("title", "Desk Lamp")
            .field("description", "Bright lamp for office")
            .field("condition", "Good")
            .attach("image", path.join(__dirname, "fixtures", "test.jpg"));

    
        expect(res.statusCode).toBe(302);

        
        expect(fs.existsSync(ITEMS_FILE)).toBe(true);
    });

    test("Submitted item appears in /items list", async () => {
      
        await request(app)
            .post("/submit-item")
            .field("title", "Office Chair")
            .field("description", "Black mesh chair")
            .field("condition", "Fair")
            .attach("image", path.join(__dirname, "fixtures", "test.jpg"));

      
        const res = await request(app).get("/items");

        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("Office Chair");
    });

    test("User can reserve an item", async () => {
       
        await request(app)
            .post("/submit-item")
            .field("title", "Coffee Table")
            .field("description", "Wooden table")
            .field("condition", "Excellent")
            .attach("image", path.join(__dirname, "fixtures", "test.jpg"));

     
        const list = await request(app).get("/items");
        const match = list.text.match(/data-id="(\d+)"/);  
        const itemId = match ? match[1] : null;

        expect(itemId).not.toBeNull();

    
        const res = await request(app)
            .post("/reserve-item")
            .send({ itemId });

    
        expect(res.statusCode).toBe(302);
    });

    test("Reserving non-existent item returns error message", async () => {
        const res = await request(app)
            .post("/reserve-item")
            .send({ itemId: "999999" });

        expect(res.statusCode).toBe(400);
        expect(res.text).toContain("Item not found");
    });
});
