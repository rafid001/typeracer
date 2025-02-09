const fallbackParagraph = "In a quiet little town, there was a small park filled with vibrant flowers and tall trees. Children played happily on swings and slides while their laughter echoed through the air. Nearby, a gentle stream flowed, reflecting the blue sky above. Every afternoon, people gathered to enjoy picnics on the grassy hills. Some brought sandwiches, while others shared fruit and cookies. As the sun began to set, the sky turned shades of orange and pink. Families packed up their things and headed home, cherishing the moments spent together. In this peaceful place, time seemed to slow down, allowing everyone to appreciate the beauty of nature. The birds chirped sweet melodies, and the breeze carried the scent of blooming flowers. It was a perfect day, filled with joy and laughter, reminding everyone of the simple pleasures that life has to offer.";


export async function generateParagraph() {
    try {
        const response = await fetch("http://metaphorpsum.com/paragraphs/10")

        if(!response.ok) {
            throw new Error();
        }

        const data = await response.text();
        const paragraph = data.split(`\n`).join(" ");

        return paragraph;
    } catch(e) {
        console.log(e);
        return fallbackParagraph;
    }
}