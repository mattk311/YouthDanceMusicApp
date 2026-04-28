import { getUncachableStripeClient } from '../server/stripeClient';

async function createSubscriptionProduct() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking for existing Youth Dance Music subscription...');
  
  const existingProducts = await stripe.products.search({ 
    query: "name:'Youth Dance Music Pro'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Youth Dance Music Pro product already exists:', existingProducts.data[0].id);
    
    const prices = await stripe.prices.list({ 
      product: existingProducts.data[0].id,
      active: true 
    });
    
    if (prices.data.length > 0) {
      console.log('Price already exists:', prices.data[0].id);
      console.log('Monthly price: $' + (prices.data[0].unit_amount! / 100).toFixed(2));
      return;
    }
  }

  console.log('Creating Youth Dance Music Pro subscription product...');
  
  const product = await stripe.products.create({
    name: 'Youth Dance Music Pro',
    description: 'Unlimited song searches for youth dance event coordinators. Get AI-powered song appropriateness evaluations without daily limits.',
    metadata: {
      type: 'subscription',
      feature: 'unlimited_searches',
    }
  });

  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'pro_monthly',
    }
  });

  console.log('Created monthly price:', monthlyPrice.id);
  console.log('Price: $9.99/month');
  console.log('\nProduct setup complete!');
  console.log('Product ID:', product.id);
  console.log('Price ID:', monthlyPrice.id);
}

createSubscriptionProduct().catch(console.error);
