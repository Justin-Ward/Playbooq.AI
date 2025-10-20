#!/usr/bin/env ts-node

/**
 * Script to populate short_id columns for existing records
 * Run this after adding the short_id columns to the database
 */

import { createSupabaseClient } from '../lib/supabase'
import { generateShortId } from '../lib/utils/shortId'

const supabase = createSupabaseClient()

async function populatePlaybookShortIds() {
  console.log('🔄 Populating short IDs for playbooks...')
  
  try {
    // Get all playbooks without short_id
    const { data: playbooks, error: fetchError } = await supabase
      .from('playbooks')
      .select('id, title')
      .is('short_id', null)
    
    if (fetchError) {
      console.error('❌ Error fetching playbooks:', fetchError)
      return
    }
    
    if (!playbooks || playbooks.length === 0) {
      console.log('✅ All playbooks already have short IDs')
      return
    }
    
    console.log(`📝 Found ${playbooks.length} playbooks without short IDs`)
    
    // Update each playbook with a short ID
    for (const playbook of playbooks) {
      const shortId = generateShortId()
      
      const { error: updateError } = await supabase
        .from('playbooks')
        .update({ short_id: shortId })
        .eq('id', playbook.id)
      
      if (updateError) {
        console.error(`❌ Error updating playbook ${playbook.id}:`, updateError)
      } else {
        console.log(`✅ Updated playbook "${playbook.title}" with short ID: ${shortId}`)
      }
    }
    
    console.log('🎉 Finished populating playbook short IDs')
  } catch (error) {
    console.error('❌ Error in populatePlaybookShortIds:', error)
  }
}

async function populateUserProfileShortIds() {
  console.log('🔄 Populating short IDs for user profiles...')
  
  try {
    // Get all user profiles without short_id
    const { data: profiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .is('short_id', null)
    
    if (fetchError) {
      console.error('❌ Error fetching user profiles:', fetchError)
      return
    }
    
    if (!profiles || profiles.length === 0) {
      console.log('✅ All user profiles already have short IDs')
      return
    }
    
    console.log(`👥 Found ${profiles.length} user profiles without short IDs`)
    
    // Update each profile with a short ID
    for (const profile of profiles) {
      const shortId = generateShortId()
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ short_id: shortId })
        .eq('id', profile.id)
      
      if (updateError) {
        console.error(`❌ Error updating profile ${profile.id}:`, updateError)
      } else {
        console.log(`✅ Updated profile "${profile.display_name || 'Unknown'}" with short ID: ${shortId}`)
      }
    }
    
    console.log('🎉 Finished populating user profile short IDs')
  } catch (error) {
    console.error('❌ Error in populateUserProfileShortIds:', error)
  }
}

async function main() {
  console.log('🚀 Starting short ID population script...')
  
  await populatePlaybookShortIds()
  await populateUserProfileShortIds()
  
  console.log('✨ Script completed!')
}

// Run the script
if (require.main === module) {
  main().catch(console.error)
}

export { populatePlaybookShortIds, populateUserProfileShortIds }

