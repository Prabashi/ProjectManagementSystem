Feature: Member Management

  Scenario: Admin adds a member to a project
    Given I am logged in as an admin
    And a project "Member Test Project" exists
    And a user "member_user" with password "Admin1234!" and role "User" exists
    When I go to the project page for "Member Test Project"
    And I click "Add member"
    And I select "member_user" from the user dropdown
    And I click "add member"
    Then I should see "member_user" in the page
