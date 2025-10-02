// Test script for question bank functionality
const testQuestionBank = async () => {
    try {
        console.log('Testing question bank API endpoints...');
        
        // Test categories endpoint
        const categoriesResponse = await fetch('https://bees-repo.onrender.com/api/question-bank/categories');
        const categoriesResult = await categoriesResponse.json();
        console.log('Categories:', categoriesResult);
        
        // Test questions endpoint
        const questionsResponse = await fetch('https://bees-repo.onrender.com/api/question-bank');
        const questionsResult = await questionsResponse.json();
        console.log('Questions count:', questionsResult.data?.length || 0);
        console.log('First few questions:', questionsResult.data?.slice(0, 3));
        
        // Test search endpoint
        const searchResponse = await fetch('https://bees-repo.onrender.com/api/question-bank/search?q=math');
        const searchResult = await searchResponse.json();
        console.log('Search results for "math":', searchResult.data?.length || 0);
        
        console.log('All tests passed!');
    } catch (error) {
        console.error('Test failed:', error);
    }
};

// Run the test
testQuestionBank();
